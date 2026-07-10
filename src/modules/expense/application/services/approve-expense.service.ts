import { ExpenseInvalidStatusError } from "@/modules/expense/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExpenseDto } from "../dtos/expense.dto";
import { toExpenseDto, toExpenseId, toUserId } from "../mappers/expense.mapper";
import {
  ExpenseIdParamSchema,
  type ExpenseIdParamInput,
} from "../schemas/expense.schemas";
import { toExpenseAuditValues } from "./expense-audit.mapper";
import {
  EXPENSE_ENTITY_NAME,
  EXPENSE_MODULE,
} from "./expense-service.constants";
import type { IExpenseTransactionRunner } from "./expense-transaction.runner";

export class ApproveExpenseService {
  constructor(
    private readonly transactionRunner: IExpenseTransactionRunner,
  ) {}

  async execute(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    const { id } = parseRequest(ExpenseIdParamSchema, params);

    return this.transactionRunner.run(
      async ({ expenseRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to approve expense",
          });
        }

        const existing = await expenseRepository.findById(toExpenseId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Expense not found",
            details: { id },
          });
        }

        let approved;

        try {
          approved = existing.withApproved(toUserId(userId));
        } catch (error) {
          if (error instanceof ExpenseInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          throw error;
        }

        const previousValues = toExpenseAuditValues(existing);
        const updated = await expenseRepository.updateStatus(existing.id, {
          status: approved.status,
          approvedAt: approved.approvedAt,
          approvedById: approved.approvedById,
        });

        await auditLogger.log({
          module: EXPENSE_MODULE,
          entityName: EXPENSE_ENTITY_NAME,
          recordId: updated.id,
          action: "APPROVE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExpenseAuditValues(updated),
        });

        return toExpenseDto(updated);
      },
    );
  }
}
