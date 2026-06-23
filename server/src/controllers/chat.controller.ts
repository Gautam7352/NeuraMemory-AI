import { NextFunction, Request, Response } from 'express';
import {
  sendMessage,
  getChatHistory,
  clearChatHistory,
} from '../services/chat.service.js';
import { AppError } from '../utils/AppError.js';

export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError(401, 'Unauthorized'));
    }

    const message: string = req.body.message;
    if (!message || !message.trim()) {
      return next(new AppError(400, 'Message cannot be empty.'));
    }

    const { reply, conversationId } = await sendMessage(userId, message);

    res.status(200).json({ success: true, data: { reply, conversationId } });
  } catch (err) {
    next(err);
  }
}

export async function getChatHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError(401, 'Unauthorized'));
    }

    const { messages, conversationId } = await getChatHistory(userId);

    res.status(200).json({ success: true, data: { messages, conversationId } });
  } catch (err) {
    next(err);
  }
}

export async function clearChatHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError(401, 'Unauthorized'));
    }

    await clearChatHistory(userId);

    res.status(200).json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    next(err);
  }
}
