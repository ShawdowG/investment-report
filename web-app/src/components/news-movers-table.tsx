import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { NewsRow } from "@/types/reports";

interface NewsMoversTableProps {
  rows: NewsRow[];
}

export function NewsMoversTable({ rows }: NewsMoversTableProps) {
  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">News Linked to Movers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Ticker</TableHead>
              <TableHead className="w-20 text-right">Move</TableHead>
              <TableHead>Why / Catalyst</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs font-semibold">
                  {row.displaySymbol}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-xs",
                    row.changePct > 0
                      ? "text-[var(--color-positive)]"
                      : row.changePct < 0
                      ? "text-[var(--color-negative)]"
                      : "text-muted-foreground"
                  )}
                >
                  {row.changePct > 0 ? "+" : ""}
                  {row.changePct.toFixed(2)}%
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.note}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
