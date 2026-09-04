import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { GroceryList } from '../types';
import { useGrocery } from '../context/GroceryContext';
import { SlideToConfirm } from './SlideToConfirm';

interface DeleteListModalProps {
  list: GroceryList | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteListModal: React.FC<DeleteListModalProps> = ({ list, isOpen, onClose }) => {
  const { items, deleteList, lists } = useGrocery();

  if (!isOpen || !list) return null;

  const listItems = items.filter((i) => i.listId === list.id);
  const itemCount = listItems.length;
  const isNotEmpty = itemCount > 0;
  const isLastList = lists.length <= 1;

  const handleDelete = () => {
    deleteList(list.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${isNotEmpty ? 'bg-rose-500' : 'bg-slate-600'}`}>
              {isNotEmpty ? <AlertTriangle className="w-5 h-5 stroke-[2.5]" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Delete List
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {list.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cannot delete the only remaining list */}
        {isLastList ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">Cannot delete your only list.</p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              CartSync requires at least one active grocery list. Create a new list first before deleting this one.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-medium text-xs active:scale-95 transition-all cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        ) : isNotEmpty ? (
          /* Non-empty List: Requires Slider Confirmation */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1.5 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-bold text-sm text-rose-900 dark:text-rose-200">
                "{list.name}" contains {itemCount} item{itemCount > 1 ? 's' : ''}!
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                Deleting this list will permanently remove all {itemCount} grocery item{itemCount > 1 ? 's' : ''} from all connected household devices.
              </p>
            </div>

            {/* Slider to Confirm */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Slide to confirm deletion:
              </label>
              <SlideToConfirm
                onConfirm={handleDelete}
                label={`Slide to delete "${list.name}"`}
                confirmedLabel="List Deleted"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Empty List: Quick Delete with Confirm Button */
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong>"{list.name}"</strong>? This list has no grocery items.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                Delete Empty List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
