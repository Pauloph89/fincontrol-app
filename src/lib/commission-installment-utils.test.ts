import { describe, expect, it } from "vitest";
import { buildCommissionMonthlySeries } from "./commission-installment-utils";

describe("buildCommissionMonthlySeries", () => {
  it("mantém parcelas em datas ISO no mês correto sem desvio de fuso", () => {
    const series = buildCommissionMonthlySeries(
      [
        { value: 133.56, due_date: "2026-05-01", status: "previsto" },
        { value: 250, due_date: "2026-04-10", status: "previsto" },
      ],
      {
        monthsBack: 0,
        monthsForward: 1,
        referenceDate: new Date("2026-04-15T12:00:00"),
      }
    );

    expect(series.find((month) => month.label === "04/2026")?.previsto).toBe(250);
    expect(series.find((month) => month.label === "05/2026")?.previsto).toBe(133.56);
  });
});