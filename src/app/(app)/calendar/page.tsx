"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Tag, X, Edit2, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiSafe } from '@/lib/api';
import type { CalendarEventServer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const EVENT_TYPES = [
  { value: 'Exam', label: 'Exam', color: 'event-exam', weight: 8 },
  { value: 'Assignment', label: 'Assignment', color: 'event-assignment', weight: 5 },
  { value: 'Study Session', label: 'Study Session', color: 'event-study', weight: -2 }, // Reduces stress
  { value: 'Sleep', label: 'Sleep', color: 'event-sleep', weight: -1 }, // Reduces stress
  { value: 'Exercise/Break', label: 'Exercise/Break', color: 'event-exercise', weight: -3 }, // Reduces stress
  { value: 'Meeting/Presentation', label: 'Meeting/Presentation', color: 'event-meeting', weight: 3 },
  { value: 'Work Shift', label: 'Work Shift', color: 'event-work', weight: 4 },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', weight: 0.7 },
  { value: 'medium', label: 'Medium', weight: 1.0 },
  { value: 'high', label: 'High', weight: 1.5 },
];

const INTENSITIES = [
  { value: 'easy', label: 'Easy', weight: 0.8 },
  { value: 'moderate', label: 'Moderate', weight: 1.0 },
  { value: 'complex', label: 'Complex', weight: 1.4 },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEventServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventServer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'Study Session',
    date: '',
    start: '',
    end: '',
    description: '',
    priority: 'medium',
    intensity: 'moderate',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const result = await apiSafe.calendarList();
      if (!result.error && result.data) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, date: formatDateKey(date) }));
    }
  };

  const handleAddEvent = () => {
    if (selectedDate) {
      setFormData({
        title: '',
        type: 'Study Session',
        date: formatDateKey(selectedDate),
        start: '',
        end: '',
        description: '',
        priority: 'medium',
        intensity: 'moderate',
      });
    }
    setEditingEvent(null);
    setIsAddModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEventServer) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      type: event.type,
      date: event.date,
      start: event.start || '',
      end: event.end || '',
      description: event.description || '',
      priority: event.priority || 'medium',
      intensity: event.intensity || 'moderate',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    if (formData.start && formData.end && formData.start >= formData.end) {
      toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    try {
      if (editingEvent) {
        // Delete and recreate (simple update strategy)
        await apiSafe.calendarDelete(editingEvent.id);
      }
      
      const result = await apiSafe.calendarAdd({
        ...formData,
        start: formData.start || undefined,
        end: formData.end || undefined,
        description: formData.description || undefined,
      });

      if (!result.error) {
        toast({ title: 'Success ✓', description: `Event ${editingEvent ? 'updated' : 'created'} successfully` });
        setIsAddModalOpen(false);
        loadEvents();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await apiSafe.calendarDelete(eventId);
      toast({ title: 'Success ✓', description: 'Event deleted' });
      loadEvents();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.color || 'event-study';
  };

  const getPriorityBadgeClass = (priority: string = 'medium') => {
    return `priority-${priority}`;
  };

  const calculateDayStress = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    let stress = 0;
    dayEvents.forEach(event => {
      const typeWeight = EVENT_TYPES.find(t => t.value === event.type)?.weight || 4;
      const priorityWeight = PRIORITIES.find(p => p.value === event.priority)?.weight || 1.5;
      stress += typeWeight * priorityWeight;
    });
    return stress;
  };

  const getDayStressColor = (stress: number) => {
    if (stress >= 20) return 'text-red-500 dark:text-red-400';
    if (stress >= 10) return 'text-orange-500 dark:text-orange-400';
    if (stress >= 5) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-green-500 dark:text-green-400';
  };

  const getDayTip = () => {
    if (!selectedDate) return null;
    const dayEvents = getEventsForDate(selectedDate);
    const stress = calculateDayStress(selectedDate);
    
    if (dayEvents.length === 0) {
      return {
        icon: <Sparkles className="h-4 w-4 text-green-500" />,
        text: "No events scheduled. Great day to focus on self-care and catch up on tasks!",
        color: "text-green-600 dark:text-green-400"
      };
    }

    if (stress >= 20) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        text: "High-stress day ahead. Schedule breaks between events and prioritize sleep.",
        color: "text-red-600 dark:text-red-400"
      };
    }

    if (stress >= 10) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        text: "Moderate workload. Stay organized and take short breaks to maintain focus.",
        color: "text-orange-600 dark:text-orange-400"
      };
    }

    return {
      icon: <Sparkles className="h-4 w-4 text-blue-500" />,
      text: "Balanced schedule. Keep up the good work and maintain your routine!",
      color: "text-blue-600 dark:text-blue-400"
    };
  };

  const days = getDaysInMonth(currentDate);
  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const dayTip = getDayTip();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-2">Smart Calendar</h1>
        <p className="text-muted-foreground">Plan your schedule and track stress levels</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Calendar */}
        <div className="space-y-4">
          <Card className="card-gradient">
          <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {events.length} event{events.length !== 1 ? 's' : ''} this month
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => {
                    const today = new Date();
                    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(today);
                  }} variant="outline" size="sm">
                    Today
                  </Button>
                </div>
              </div>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const isSelected = selectedDate && formatDateKey(day) === formatDateKey(selectedDate);
                      const isToday = formatDateKey(day) === formatDateKey(new Date());
                      const dayEvents = getEventsForDate(day);
                      const stress = calculateDayStress(day);

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={cn(
                            "calendar-day aspect-square",
                            isSelected && "selected",
                            isToday && !isSelected && "ring-2 ring-primary",
                            dayEvents.length > 0 && "has-events"
                          )}
                        >
                          <div className="text-sm font-medium">{day.getDate()}</div>
                          {dayEvents.length > 0 && (
                            <div className="mt-1 flex flex-col gap-0.5">
                              {dayEvents.slice(0, 2).map(event => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "h-1 rounded-full",
                                    getEventTypeColor(event.type)
                                  )}
                                />
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected day info */}
          <Card className="card-gradient dark:glow-accent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedDate ? (
                    <>
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </>
                  ) : (
                    'Select a date'
                  )}
                </CardTitle>
                {selectedDate && (
                  <Button size="sm" onClick={handleAddEvent} className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click a date to view or add events
                </p>
              ) : selectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No events scheduled</p>
                  <Button size="sm" onClick={handleAddEvent} variant="outline" className="mt-3">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(event => (
                    <Card key={event.id} className="overflow-hidden">
                      <div className={cn("h-1", getEventTypeColor(event.type))} />
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{event.title}</h4>
                            {event.start && event.end && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {event.start} - {event.end}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {event.type}
                          </Badge>
                          <Badge className={cn("text-xs", getPriorityBadgeClass(event.priority))}>
                            {(event.priority || 'medium').toUpperCase()}
                          </Badge>
                          {event.intensity && (
                            <Badge variant="secondary" className="text-xs">
                              {event.intensity.charAt(0).toUpperCase() + event.intensity.slice(1)}
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

          {/* Day Tips */}
          {selectedDate && dayTip && (
            <Card className="border-l-4" style={{ borderLeftColor: dayTip.color.includes('red') ? 'hsl(var(--destructive))' : dayTip.color.includes('green') ? 'hsl(var(--event-exercise))' : 'hsl(var(--primary))' }}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {dayTip.icon}
                  Day Insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-sm", dayTip.color)}>{dayTip.text}</p>
              </CardContent>
            </Card>
          )}

          {/* All Events List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All Upcoming Events</CardTitle>
              <CardDescription className="text-xs">
                Sorted by date and time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No events scheduled
                </p>
              ) : (
                events
                  .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);
                    if (dateCompare !== 0) return dateCompare;
                    return (a.start || '').localeCompare(b.start || '');
                  })
                  .map(event => (
                    <Card 
                      key={event.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const eventDate = new Date(event.date + 'T00:00:00');
                        setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
                        setSelectedDate(eventDate);
                      }}
                    >
                      <div className={cn("h-1", getEventTypeColor(event.type))} />
                      <CardContent className="p-2 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold truncate">{event.title}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {event.start && ` • ${event.start}`}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {event.type}
                          </Badge>
                          <Badge className={cn("text-[9px] px-1 py-0", getPriorityBadgeClass(event.priority))}>
                            {(event.priority || 'medium')[0].toUpperCase()}
                          </Badge>
                          {event.intensity && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              {event.intensity[0].toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Legend */}
        <Card>
          <CardHeader>
              <CardTitle className="text-sm">Event Types</CardTitle>
          </CardHeader>
            <CardContent className="space-y-2">
              {EVENT_TYPES.map(type => (
                <div key={type.value} className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full", type.color)} />
                  <span className="text-xs text-muted-foreground">{type.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Math Exam"
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="intensity">Complexity</Label>
                <Select value={formData.intensity} onValueChange={(value) => setFormData({ ...formData, intensity: value })}>
                  <SelectTrigger id="intensity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITIES.map(intensity => (
                      <SelectItem key={intensity.value} value={intensity.value}>
                        {intensity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={formData.start}
                  onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={formData.end}
                  onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add notes or details..."
                rows={3}
              />
            </div>
      </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary">
              {editingEvent ? 'Update' : 'Add'} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
