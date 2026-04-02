import { describe, expect, it } from "vitest";
import { buildCommissionMonthlySeries } from "./commission-installment-utils";

describe("buildCommissionMonthlySeries", () => {
  it("mantém parcelas em datas ISO no mês correto sem desvio de fuso", () => {
    const series = buildCommissionMonthlySeries(
      [
        { value: 133.56, due_date: "2026-05-01", status: "previsto" },
        { value: 250, due_date: "2026-04-20", status: "previsto" },
      ],
      {
        monthsBack: 0,
        monthsForward: 1,
        referenceDate: new Date("2026-04-10T12:00:00"),
      }
    );

    const apr = series.find((m) => m.key === "2026-04");
    const may = series.find((m) => m.key === "2026-05");
    expect(apr?.previsto).toBe(250);
    expect(may?.previsto).toBe(133.56);
  });

  it("classifica parcelas recebidas pelo paid_date e não pelo due_date", () => {
    const series = buildCommissionMonthlySeries(
      [
        { value: 500, due_date: "2026-03-15", paid_date: "2026-04-05", status: "recebido" },
      ],
      {
        monthsBack: 1,
        monthsForward: 0,
        referenceDate: new Date("2026-04-10T12:00:00"),
      }
    );

    const mar = series.find((m) => m.key === "2026-03");
    const apr = series.find((m) => m.key === "2026-04");
    expect(mar?.recebido).toBe(0);
    expect(apr?.recebido).toBe(500);
  });
});