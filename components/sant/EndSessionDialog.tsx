import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface EndSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEnd: (action: 'save' | 'delete') => void;
    loading: boolean;
}

export default function EndSessionDialog({ open, onOpenChange, onEnd, loading }: EndSessionDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Хичээлийг дуусгах</AlertDialogTitle>
                    <AlertDialogDescription>
                        Та энэ хичээлийг хадгалж үлдээх үү, эсвэл бүр мөсөн устгах уу?
                        <br /><br />
                        <strong>Хадгалах:</strong> Хичээлийн түүхэнд үлдэнэ.<br />
                        <strong>Устгах:</strong> Бүх өгөгдөл устана.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel disabled={loading}>Болих</AlertDialogCancel>
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button
                            variant="default"
                            onClick={(e) => { e.preventDefault(); onEnd('save'); }}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Хадгалж дуусгах
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={(e) => { e.preventDefault(); onEnd('delete'); }}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Устгаж дуусгах
                        </Button>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
