import { Download, Upload, FileSpreadsheet, Printer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImportExportDropdownsProps {
  onExportCSV?: () => void;
  onExportXLS?: () => void;
  onPrint?: () => void;
  onImportCSV?: () => void;
  onImportXLS?: () => void;
  canWrite?: boolean;
}

export function ImportExportDropdowns({
  onExportCSV,
  onExportXLS,
  onPrint,
  onImportCSV,
  onImportXLS,
  canWrite = true,
}: ImportExportDropdownsProps) {
  const hasExport = onExportCSV || onExportXLS || onPrint;
  const hasImport = onImportCSV || onImportXLS;

  return (
    <div className="flex items-center gap-2">
      {hasExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            {onExportCSV && (
              <DropdownMenuItem onClick={onExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </DropdownMenuItem>
            )}
            {onExportXLS && (
              <DropdownMenuItem onClick={onExportXLS}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (XLS)
              </DropdownMenuItem>
            )}
            {onPrint && (
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasImport && canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Importer
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            {onImportCSV && (
              <DropdownMenuItem onClick={onImportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </DropdownMenuItem>
            )}
            {onImportXLS && (
              <DropdownMenuItem onClick={onImportXLS}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (XLS)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
