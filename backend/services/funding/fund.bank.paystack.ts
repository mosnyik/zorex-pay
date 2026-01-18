import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma";
import axios from "axios";

interface FundingInput {
  walletId: string;
  amount: number;
}
export const initializeWalletFunding = async (input: FundingInput) => {
  const wallet = await prisma.wallets.findUnique({
    where: { id: input.walletId },
    include: { users: true },
  });

  if (!wallet || wallet.status !== "ACTIVE") {
    throw new Error("Invalid wallet");
  }

  const reference = `zorex_${uuidv4()}`;

  const transaction = await prisma.transactions.create({
    data: {
      reference,
      type: "FUNDING",
      status: "PENDING",
      metadata: {
        walletId: wallet.id,
        userId: wallet.user_id,
      },
    },
  });

  const paystackResponse = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: wallet.users.email,
      amount: input.amount * 100,
      reference,
      currency: "NGN",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    authorizationUrl: paystackResponse.data.data.authorization_url,
    reference,
  };
};
