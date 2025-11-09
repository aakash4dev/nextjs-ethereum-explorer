import dbConnect, { Address, Transaction, Block } from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import Web3 from 'web3';

const web3 = new Web3(process.env.ETHEREUM_RPC_URL);

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { address } = params;

    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Get or create address record
    let addressRecord = await Address.findOne({ address: normalizedAddress }).lean();

    // Get current balance from blockchain
    let balance = '0';
    let isContract = false;
    try {
      balance = await web3.eth.getBalance(normalizedAddress);
      const code = await web3.eth.getCode(normalizedAddress);
      isContract = code !== '0x';
    } catch (error) {
      console.error('Error fetching balance:', error);
    }

    // Update address record
    if (addressRecord) {
      await Address.updateOne(
        { address: normalizedAddress },
        {
          $set: {
            balance: balance.toString(),
            isContract,
            lastSeen: new Date(),
          },
        }
      );
    } else {
      addressRecord = await Address.create({
        address: normalizedAddress,
        balance: balance.toString(),
        isContract,
        firstSeen: new Date(),
        lastSeen: new Date(),
      });
    }

    // Get pagination params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    // Get transactions
    const transactions = await Transaction.find({
      $or: [
        { from: normalizedAddress },
        { to: normalizedAddress },
      ],
    })
      .sort({ blockNumber: -1, transactionIndex: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const totalTransactions = await Transaction.countDocuments({
      $or: [
        { from: normalizedAddress },
        { to: normalizedAddress },
      ],
    });

    // Get stats
    const sentCount = await Transaction.countDocuments({ from: normalizedAddress });
    const receivedCount = await Transaction.countDocuments({ to: normalizedAddress });
    const totalSent = await Transaction.aggregate([
      { $match: { from: normalizedAddress } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$value' } } } },
    ]);
    const totalReceived = await Transaction.aggregate([
      { $match: { to: normalizedAddress } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$value' } } } },
    ]);

    return NextResponse.json({
      address: {
        ...addressRecord,
        balance: balance.toString(),
        isContract,
      },
      transactions,
      stats: {
        totalTransactions,
        sentCount,
        receivedCount,
        totalSent: totalSent[0]?.total?.toString() || '0',
        totalReceived: totalReceived[0]?.total?.toString() || '0',
      },
      pagination: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    });
  } catch (error) {
    console.error('Address API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

