import { useState, useMemo } from "react";
import { CalendarNote } from "@/types/calendarNote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, X, Bell, BellOff, Pencil, Check } from "lucide-react";
import { generateId } from "@/lib/habitUtils";
import { toast } from "sonner";

interface CalendarViewProps {
  notes: CalendarNote[];
  onAddNote: (note: CalendarNote) => void;
  onDeleteNote: (id: string) => void;
  onEditNote: (id: string, updated: Partial<CalendarNote>) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const CalendarView = ({ notes, onAddNote, onDeleteNote, onEditNote }: CalendarViewProps) => {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTime, setEditTime] = useState("");

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();

  const toDateStr = (day: number) =>
    `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const notesByDate = useMemo(() => {
    const map: Record<string, CalendarNote[]> = {};
    notes.forEach(n => {
      if (!map[n.date]) map[n.date] = [];
      map[n.date].push(n);
    });
    return map;
  }, [notes]);

  const selectedNotes = selectedDate ? (notesByDate[selectedDate] || []) : [];

  const handleAddNote = () => {
    if (!newTitle.trim() || !selectedDate) return;
    const note: CalendarNote = {
      id: generateId(),
      date: selectedDate,
      title: newTitle.trim(),
      body: newBody.trim() || undefined,
      notifyAt: notifyEnabled ? newTime : undefined,
    };
    onAddNote(note);
    toast.success(`Note added for ${selectedDate}${notifyEnabled ? ` · Reminder at ${newTime}` : ""}`);
    setNewTitle("");
    setNewBody("");
    setNewTime("09:00");
    setNotifyEnabled(true);
    setShowForm(false);
  };

  const startEdit = (note: CalendarNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body || "");
    setEditTime(note.notifyAt || "09:00");
  };

  const commitEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    onEditNote(editingId, { title: editTitle.trim(), body: editBody.trim() || undefined, notifyAt: editTime || undefined });
    setEditingId(null);
    toast.success("Note updated");
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  // Calendar grid
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold text-base">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = toDateStr(day);
            const hasNotes = (notesByDate[dateStr]?.length ?? 0) > 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => { setSelectedDate(dateStr); setShowForm(false); }}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg p-1.5 min-h-[40px] text-sm transition-colors
                  ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/20 text-primary font-bold" : "hover:bg-muted"}
                `}
              >
                <span>{day}</span>
                {hasNotes && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected date panel */}
      {selectedDate && (
        <Card className="p-4 border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3 h-3" /> Add Note
            </Button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="space-y-2 border border-border rounded-lg p-3">
              <Input
                placeholder="Title (e.g. Go to gym, Take medicine...)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAddNote(); if (e.key === "Escape") setShowForm(false); }}
              />
              <Textarea
                placeholder="Notes (optional)..."
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                className="text-sm resize-none min-h-[60px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant={notifyEnabled ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setNotifyEnabled(!notifyEnabled)}
                >
                  {notifyEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                  Remind me
                </Button>
                {notifyEnabled && (
                  <Input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="h-7 text-xs w-28"
                  />
                )}
                <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleAddNote}>Save</Button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {selectedNotes.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground italic">No notes for this day. Tap "Add Note" to create one.</p>
          )}

          <div className="space-y-2">
            {selectedNotes.map(note => (
              <div key={note.id} className="border border-border rounded-lg p-3 space-y-1">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm" autoFocus />
                    <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="text-sm resize-none min-h-[50px]" />
                    <div className="flex items-center gap-2">
                      <Bell className="w-3 h-3 text-muted-foreground" />
                      <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="h-7 text-xs w-28" />
                      <Button size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={commitEdit}><Check className="w-3 h-3" />Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{note.title}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(note)} aria-label="Edit note"><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onDeleteNote(note.id); toast.success("Note deleted"); }} aria-label="Delete note"><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    {note.body && <p className="text-xs text-muted-foreground">{note.body}</p>}
                    {note.notifyAt && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Bell className="w-3 h-3" /> Reminder at {note.notifyAt}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
