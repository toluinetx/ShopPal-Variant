import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { UserNotification, NotificationType } from '@/shared/models/entities';
import { NotificationRepository } from './notifications-inbox.repository';
import { emitEvent } from '@/shared/utils/notifier';

export type CreateNotificationInput = {
    user_id: string;
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: string;
    action_url?: string;
};

export class NotificationService {
    static async list(user_id: string, opts: { limit: number; offset: number; unread_only: boolean }) {
        const [items, unread_count] = await Promise.all([
            NotificationRepository.list(user_id, opts),
            NotificationRepository.unreadCount(user_id),
        ]);
        return { items, unread_count };
    }

    static async createForUser(payload: CreateNotificationInput): Promise<UserNotification> {
        const created = await NotificationRepository.create({
            user_id: payload.user_id,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            metadata: payload.metadata,
            action_url: payload.action_url,
            is_read: false,
        });
        // Also fan out to the platform notifications service for observability.
        emitEvent({
            type: `inbox.${payload.type}`,
            payload: {
                notification_id: created.notification_id,
                user_id: payload.user_id,
                title: payload.title,
            },
        });
        return created;
    }

    static async markRead(notification_id: string, user_id: string) {
        const result = await NotificationRepository.markRead(notification_id, user_id);
        if (result.affected === 0) {
            throw new AppError('Notification not found', HttpStatusCode.NOT_FOUND, 'markRead');
        }
    }

    static async markAllRead(user_id: string) {
        await NotificationRepository.markAllRead(user_id);
    }

    static async delete(notification_id: string, user_id: string) {
        const result = await NotificationRepository.delete(notification_id, user_id);
        if (result.affected === 0) {
            throw new AppError('Notification not found', HttpStatusCode.NOT_FOUND, 'delete-notification');
        }
    }
}
