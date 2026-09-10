export const CSV_TEMPLATE_HEADER = ["id","orderDate","region","country","category","subcategory","productName","channel","customerSegment","quantity","unitPriceCents","discountPercent","revenueCents","costCents","profitCents","status"].join(",") + "\n";
export const CSV_TEMPLATE_EXAMPLE = [
  ["ORD-000001-123","2024-02-15","North America","United States","Electronics","Phones","QuantumPhone X","Web","Consumer","1","89900","10","80910","55000","25910","Completed"],
  ["ORD-000002-456","2024-02-16","Europe","Germany","Apparel","Menswear","Urban Jacket","Mobile","Small Business","2","9900","0","19800","11000","8800","Completed"],
].map(r=>r.join(",")).join("\n") + "\n";

export function buildTemplateCsv(): string {
  return CSV_TEMPLATE_HEADER + CSV_TEMPLATE_EXAMPLE;
}
