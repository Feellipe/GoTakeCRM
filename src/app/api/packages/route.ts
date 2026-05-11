import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all packages
export async function GET() {
  try {
    const packages = await db.package.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

// POST create new package
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newPackage = await db.package.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        currency: body.currency || 'BRL',
        deliverables: JSON.stringify(body.deliverables || []),
        duration: body.duration || 4,
        category: body.category || 'photography',
        active: true,
      },
    });
    return NextResponse.json(newPackage);
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
