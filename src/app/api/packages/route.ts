import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, packageCreateSchema } from '@/lib/validations';

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
    const rawBody = await request.json();
    const body = validateOrThrow(packageCreateSchema, rawBody);

    const newPackage = await db.package.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        deliverables: body.deliverables,
        duration: body.duration,
        category: body.category,
        active: body.active,
      },
    });
    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating package:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
