import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { UserLoginInput, UserCreateInput, ApiResponse } from '../types';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const userData: UserCreateInput = req.body;
      
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Create new user
      const user = await UserModel.create(userData);
      
      // Generate JWT token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        secret as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token
        },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password }: UserLoginInput = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Validate password
      const isValidPassword = await UserModel.validatePassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token
        },
        message: 'Login successful'
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const user = await UserModel.findById((req.user as any)!.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 