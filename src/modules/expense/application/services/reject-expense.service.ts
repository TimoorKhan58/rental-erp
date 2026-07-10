import {
  ExpenseInvalidStatusError,
  ExpenseInvariantError,
} from "@/modules/expense/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExpenseDto } from "../dtos/expense.dto";
import {
  toExpenseDto,
  toExpenseId,
  toRejectExpenseData,
} from "../mappers/expense.mapper";
import {
  ExpenseIdParamSchema,
  RejectExpenseSchema,
  type ExpenseIdParamInput,
  type RejectExpenseInput,
} from "../schemas/expense.schemas";
import { toExpenseAuditValues } from "./expense-audit.mapper";
import {
  EXPENSE_ENTITY_NAME,
  EXPENSE_MODULE,
} from "./expense-service.constants";
import type { IExpenseTransactionRunner } from "./expense-transaction.runner";

export class RejectExpenseService {
  constructor(
    private readonly transactionRunner: IExpenseTransactionRunner,
  ) {}

  async execute(
    params: ExpenseIdParamInput,
    input: RejectExpenseInput,
  ): Promise<ExpenseDto> {
    const { id } = parseRequest(ExpenseIdParamSchema, params);
    const data = parseRequest(RejectExpenseSchema, input);
    const rejectData = toRejectExpenseData(data);

    return this.transactionRunner.run(
      async ({ expenseRepository, auditLogger }) => {
        const existing = await expenseRepository.findById(toExpenseId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Expense not found",
            details: { id },
          });
        }

        let rejected;

        try {
          rejected = existing.withRejected(rejectData);
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

          if (error instanceof ExpenseInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const previousValues = toExpenseAuditValues(existing);
        const updated = await expenseRepository.updateStatus(existing.id, {
          status: rejected.status,
          rejectedAt: rejected.rejectedAt,
          rejectionReason: rejected.rejectionReason,
        });

        await auditLogger.log({
          module: EXPENSE_MODULE,
          entityName: EXPENSE_ENTITY_NAME,
          recordId: updated.id,
          action: "REJECT",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExpenseAuditValues(updated),
        });

        return toExpenseDto(updated);
      },
    );
  }
}
