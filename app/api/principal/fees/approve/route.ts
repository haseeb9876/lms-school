import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { feeId, status } = await req.json();

    if (!feeId || !status) {
      return NextResponse.json({ message: "Fee ID and status required" }, { status: 400 });
    }

    const updated = await prisma.feeRecord.update({
      where: { id: feeId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: "Failed to update fee status" }, { status: 500 });
  }
}
