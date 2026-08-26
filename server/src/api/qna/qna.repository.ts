import { AppDataSource } from '@/shared/db/pg.data-source';
import { ProductQuestion, ProductAnswer, User } from '@/shared/models/entities';

export type QuestionWithAuthor = {
    question_id: string;
    product_id: string;
    body: string;
    created_at: Date;
    author: { user_id: string; username: string; avatar: string | null };
    answers: Array<{
        answer_id: string;
        body: string;
        created_at: Date;
        is_staff: boolean;
        author: { user_id: string; username: string; avatar: string | null };
    }>;
};

export const QnaRepository = AppDataSource.getRepository(ProductQuestion).extend({
    async listForProduct(
        product_id: string,
        limit: number,
        offset: number
    ): Promise<QuestionWithAuthor[]> {
        const rows = await this.createQueryBuilder('q')
            .innerJoin(User, 'u', 'u.user_id = q.user_id')
            .leftJoin(ProductAnswer, 'a', 'a.question_id = q.question_id')
            .leftJoin(User, 'au', 'au.user_id = a.user_id')
            .select([
                'q.question_id AS question_id',
                'q.product_id AS product_id',
                'q.body AS body',
                'q.created_at AS created_at',
                'q.user_id AS q_user_id',
                'u.username AS q_username',
                'u.avatar AS q_avatar',
                `COALESCE(json_agg(
                    json_build_object(
                        'answer_id', a.answer_id,
                        'body', a.body,
                        'created_at', a.created_at,
                        'is_staff', a.is_staff,
                        'author', json_build_object(
                            'user_id', au.user_id,
                            'username', au.username,
                            'avatar', au.avatar
                        )
                    ) ORDER BY a.created_at ASC
                ) FILTER (WHERE a.answer_id IS NOT NULL), '[]') AS answers`,
            ])
            .where('q.product_id = :product_id', { product_id })
            .groupBy('q.question_id')
            .addGroupBy('u.user_id')
            .orderBy('q.created_at', 'DESC')
            .offset(offset)
            .limit(limit)
            .getRawMany();

        return rows.map((r) => ({
            question_id: r.question_id,
            product_id: r.product_id,
            body: r.body,
            created_at: r.created_at,
            author: {
                user_id: r.q_user_id,
                username: r.q_username,
                avatar: r.q_avatar,
            },
            answers: r.answers,
        }));
    },

    async findQuestionById(question_id: string): Promise<ProductQuestion | null> {
        return this.findOne({ where: { question_id } });
    },

    async ask(question: Partial<ProductQuestion>): Promise<ProductQuestion> {
        const entity = this.create(question);
        return this.save(entity as ProductQuestion);
    },

    async answer(payload: Partial<ProductAnswer>): Promise<ProductAnswer> {
        const repo = AppDataSource.getRepository(ProductAnswer);
        const entity = repo.create(payload);
        return repo.save(entity as ProductAnswer);
    },

    async deleteQuestion(question_id: string, user_id: string) {
        return this.createQueryBuilder()
            .delete()
            .from(ProductQuestion)
            .where('question_id = :question_id AND user_id = :user_id', { question_id, user_id })
            .execute();
    },
});
