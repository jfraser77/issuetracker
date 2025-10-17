import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const pool = await connectToDatabase();

    // Find user
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const user = result.recordset[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-user', user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    
  } catch (error: any) {
    console.error('Signin API error:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}