import * as React from "react"
import { cn } from "@/lib/utils"

interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
  }>;
  className?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  className 
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "p-4 align-middle",
                      column.className
                    )}
                  >
                    {typeof column.accessor === "function"
                      ? column.accessor(row)
                      : String(row[column.accessor] || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}