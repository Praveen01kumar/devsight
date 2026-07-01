import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Helper to calculate timezone offset in minutes at a specific date
function tzDate(date: Date, tz: string): number {
    try {
        const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
        const parts = dtf.formatToParts(date);
        const getPart = (type: string) => Number.parseInt(parts.find(p => p.type === type)?.value || '0', 10);

        const year = getPart('year');
        const month = getPart('month') - 1;
        const day = getPart('day');
        const hour = getPart('hour');
        const minute = getPart('minute');
        const second = getPart('second');

        const targetLocalUTC = Date.UTC(year, month, day, hour, minute, second, date.getMilliseconds());
        const actualUTC = Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds(),
            date.getUTCMilliseconds()
        );

        return (targetLocalUTC - actualUTC) / 60000;
    } catch {
        // Fallback if timezone not supported
        return -date.getTimezoneOffset();
    }
}

// Helper to create a Date in a target timezone given local components
function createDateInTimezone(tz: string, year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number): Date {
    const utcTime = Date.UTC(year, month, day, hour, minute, second, ms);
    let date = new Date(utcTime);

    for (let i = 0; i < 5; i++) {
        try {
            const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
            const parts = dtf.formatToParts(date);
            const getPart = (type: string) => Number.parseInt(parts.find(p => p.type === type)?.value || '0', 10);

            const actualYear = getPart('year');
            const actualMonth = getPart('month') - 1;
            const actualDay = getPart('day');
            const actualHour = getPart('hour');
            const actualMinute = getPart('minute');
            const actualSecond = getPart('second');

            const actualLocalUTC = Date.UTC(actualYear, actualMonth, actualDay, actualHour, actualMinute, actualSecond, date.getMilliseconds());
            const targetLocalUTC = Date.UTC(year, month, day, hour, minute, second, ms);

            const diff = actualLocalUTC - targetLocalUTC;
            if (diff === 0) break;

            date = new Date(date.getTime() - diff);
        } catch {
            break;
        }
    }
    return date;
}

// Helper to check DST info
function getDSTInfo(date: Date, tz: string) {
    const currentOffset = tzDate(date, tz);
    const janDate = new Date(date.getFullYear(), 0, 1);
    const julDate = new Date(date.getFullYear(), 6, 1);
    const janOffset = tzDate(janDate, tz);
    const julOffset = tzDate(julDate, tz);

    const hasDST = janOffset !== julOffset;
    const isDSTActive = hasDST && currentOffset === Math.max(janOffset, julOffset);

    return {
        hasDST,
        isDSTActive
    };
}

// Helper to extract abbreviation
function getTzAbbr(date: Date, tz: string): string {
    try {
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'short',
        });
        const parts = dtf.formatToParts(date);
        return parts.find(p => p.type === 'timeZoneName')?.value || '';
    } catch {
        return 'UTC';
    }
}

// Helper to get relative day label
function getRelativeDay(baseDate: Date, baseTz: string, comparedDate: Date, comparedTz: string): string {
    const getLocalDateString = (d: Date, tz: string) => {
        try {
            const dtf = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
            return dtf.format(d);
        } catch {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
    };

    const baseStr = getLocalDateString(baseDate, baseTz);
    const comparedStr = getLocalDateString(comparedDate, comparedTz);

    if (baseStr === comparedStr) {
        return 'Today';
    }

    const parseLocalDate = (str: string) => {
        const [m, d, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d);
    };

    try {
        const baseLocalDate = parseLocalDate(baseStr);
        const comparedLocalDate = parseLocalDate(comparedStr);

        const diffTime = comparedLocalDate.getTime() - baseLocalDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 1) return `In ${diffDays} days`;
        return `${Math.abs(diffDays)} days ago`;
    } catch {
        return 'Today';
    }
}

// Helper to format offsets
function formatOffsetISO(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatOffsetDiff(minutesDiff: number): string {
    if (minutesDiff === 0) return 'Same Time';
    const sign = minutesDiff >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutesDiff);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;

    if (mins === 0) {
        return `${sign}${hours}h`;
    }
    return `${sign}${hours}h ${mins}m`;
}

// Fallback/standard parsed tz function
function parseTimezoneID(tz: string) {
    const parts = tz.split('/');
    if (parts.length >= 2) {
        const region = parts[0].replace(/_/g, ' ');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        return { region, city, country: region, abbr: '' };
    }
    return { region: 'Global', city: tz, country: 'International', abbr: '' };
}

interface TimezoneMeta { timezone: string; country: string; city: string; abbr: string; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-timezone-converter',
    imports: [CommonModule, FormsModule],
    templateUrl: './timezone-converter.html'
})
export class TimezoneConverter implements OnInit, OnDestroy {
    // --- CORE SIGNALS ---
    baseDate = signal<Date>(new Date());
    baseTimezone = signal<string>('UTC');
    comparedTimezone = signal<string>('Asia/Kolkata');
    isLiveMode = signal<boolean>(true);

    // --- SEARCH & SUGGESTIONS SIGNALS ---
    searchQuery = signal<string>('');
    showSearchDropdown = signal<boolean>(false);
    timezoneList = signal<TimezoneMeta[]>([]);
    timezoneMetaMap = signal<Map<string, TimezoneMeta>>(new Map());

    // --- FAVORITES & SHARING ---
    favorites = signal<string[]>(['Asia/Kolkata', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney']);

    // --- CUSTOM CONVERSION SLIDER VALUES ---
    customYear = signal<number>(2026);
    customMonth = signal<number>(6); // 0-indexed
    customDay = signal<number>(1);
    customHour = signal<number>(12);
    customMinute = signal<number>(0);
    customSecond = signal<number>(0);
    customMs = signal<number>(0);

    private timerId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Auto-detect browser timezone
        try {
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (localTz) {
                this.baseTimezone.set(localTz);
                if (localTz === 'America/New_York') {
                    this.comparedTimezone.set('Europe/London');
                } else {
                    this.comparedTimezone.set('America/New_York');
                }
            }
        } catch {
            // Keep defaults
        }
    }

    ngOnInit() {
        this.loadFavoritesFromStorage();
        this.loadStateFromUrl();

        // Start single shared high-precision timer
        this.timerId = setInterval(() => {
            if (this.isLiveMode()) {
                const now = new Date();
                this.baseDate.set(now);
                this.syncCustomInputs(now, this.baseTimezone());
            }
        }, 45); // ~22 frames per second for super-smooth millisecond tick

        this.loadTimezonesDatabase();
    }

    ngOnDestroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    // --- DATABASE INITIALIZATION ---
    async loadTimezonesDatabase() {
        try {
            const res = await fetch('/countries-timezones.json');
            if (res.ok) {
                const data: TimezoneMeta[] = await res.json();
                this.timezoneList.set(data);
                const map = new Map<string, TimezoneMeta>();
                data.forEach(item => {
                    map.set(item.timezone, item);
                });
                this.timezoneMetaMap.set(map);
            }
        } catch { }

        // Merge and complete with all supported browser timezones
        try {
            const allSupportedTzs = Intl.supportedValuesOf('timeZone');
            const currentList = [...this.timezoneList()];
            const currentMap = new Map(this.timezoneMetaMap());
            let updated = false;

            allSupportedTzs.forEach(tz => {
                if (!currentMap.has(tz)) {
                    const parsed = parseTimezoneID(tz);
                    const meta: TimezoneMeta = {
                        timezone: tz,
                        country: parsed.country,
                        city: parsed.city,
                        abbr: getTzAbbr(new Date(), tz),
                    };
                    currentList.push(meta);
                    currentMap.set(tz, meta);
                    updated = true;
                }
            });

            if (updated) {
                this.timezoneList.set(currentList);
                this.timezoneMetaMap.set(currentMap);
            }
        } catch {
            // standard fallbacks already in list
        }
    }

    // --- SYNC LOCAL INPUTS ---
    syncCustomInputs(date: Date, tz: string) {
        try {
            const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
            const parts = dtf.formatToParts(date);
            const getPart = (type: string) => Number.parseInt(parts.find(p => p.type === type)?.value || '0', 10);

            this.customYear.set(getPart('year'));
            this.customMonth.set(getPart('month') - 1);
            this.customDay.set(getPart('day'));
            this.customHour.set(getPart('hour'));
            this.customMinute.set(getPart('minute'));
            this.customSecond.set(getPart('second'));
            this.customMs.set(date.getMilliseconds());
        } catch {
            this.customYear.set(date.getFullYear());
            this.customMonth.set(date.getMonth());
            this.customDay.set(date.getDate());
            this.customHour.set(date.getHours());
            this.customMinute.set(date.getMinutes());
            this.customSecond.set(date.getSeconds());
            this.customMs.set(date.getMilliseconds());
        }
    }

    // --- REACTIVE INPUT HANDLERS ---
    onCustomTimeChange() {
        this.isLiveMode.set(false);
        const updatedDate = createDateInTimezone(
            this.baseTimezone(),
            this.customYear(),
            this.customMonth(),
            this.customDay(),
            this.customHour(),
            this.customMinute(),
            this.customSecond(),
            this.customMs()
        );
        this.baseDate.set(updatedDate);
    }

    toggleLiveMode() {
        const nextMode = !this.isLiveMode();
        this.isLiveMode.set(nextMode);
        if (nextMode) {
            const now = new Date();
            this.baseDate.set(now);
            this.syncCustomInputs(now, this.baseTimezone());
        } else {
            this.syncCustomInputs(this.baseDate(), this.baseTimezone());
        }
    }

    onHourChange(h: number | null) {
        if (h === null || isNaN(h)) return;
        this.customHour.set(Math.max(0, Math.min(23, h)));
        this.onCustomTimeChange();
    }

    selectHour(h: number) {
        this.onHourChange(h);
    }

    onMinuteChange(m: number | null) {
        if (m === null || Number.isNaN(m)) return;
        this.customMinute.set(Math.max(0, Math.min(59, m)));
        this.onCustomTimeChange();
    }

    onSecondChange(s: number | null) {
        if (s === null || Number.isNaN(s)) return;
        this.customSecond.set(Math.max(0, Math.min(59, s)));
        this.onCustomTimeChange();
    }

    onMsChange(ms: number | null) {
        if (ms === null || Number.isNaN(ms)) return;
        this.customMs.set(Math.max(0, Math.min(999, ms)));
        this.onCustomTimeChange();
    }

    onDateChange(value: string) {
        if (!value) return;
        const parts = value.split('-');
        if (parts.length === 3) {
            this.customYear.set(Number.parseInt(parts[0], 10));
            this.customMonth.set(Number.parseInt(parts[1], 10) - 1);
            this.customDay.set(Number.parseInt(parts[2], 10));
            this.onCustomTimeChange();
        }
    }

    // Formatted date string "YYYY-MM-DD" for standard browser input
    localDatePickerValue = computed(() => {
        const year = this.customYear();
        const month = (this.customMonth() + 1).toString().padStart(2, '0');
        const day = this.customDay().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    // --- COMPUTED VIEW DETAILS (BASE TIMEZONE) ---
    baseTimeDetails = computed(() => {
        const date = this.baseDate();
        const tz = this.baseTimezone();
        const offset = tzDate(date, tz);
        const offsetStr = formatOffsetISO(offset);
        const dstInfo = getDSTInfo(date, tz);
        const abbr = getTzAbbr(date, tz);

        let formattedDate = '';
        let formattedTime = '';
        let weekday = '';
        let monthName = '';
        let year = '';

        try {
            const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
            const parts = dtf.formatToParts(date);
            const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

            const hour = getVal('hour').padStart(2, '0');
            const minute = getVal('minute').padStart(2, '0');
            const second = getVal('second').padStart(2, '0');

            formattedTime = `${hour}:${minute}:${second}`;
            formattedDate = `${getVal('weekday')}, ${getVal('month')} ${getVal('day')}, ${getVal('year')}`;
            weekday = getVal('weekday');
            monthName = getVal('month');
            year = getVal('year');
        } catch {
            // Fallback
            formattedTime = date.toTimeString().split(' ')[0];
            formattedDate = date.toDateString();
            weekday = formattedDate.split(' ')[0];
            monthName = formattedDate.split(' ')[1];
            year = date.getFullYear().toString();
        }

        const meta = this.timezoneMetaMap().get(tz) || parseTimezoneID(tz);

        return {
            timezone: tz,
            country: meta.country,
            city: meta.city,
            abbr: abbr || meta.abbr || 'UTC',
            formattedDate,
            formattedTime,
            ms: date.getMilliseconds().toString().padStart(3, '0'),
            offsetStr,
            isDSTActive: dstInfo.isDSTActive,
            hasDST: dstInfo.hasDST,
            weekday,
            monthName,
            year
        };
    });

    // --- COMPUTED VIEW DETAILS (COMPARED TIMEZONE) ---
    comparedTimeDetails = computed(() => {
        const date = this.baseDate();
        const tz = this.comparedTimezone();
        const baseTz = this.baseTimezone();

        const baseOffset = tzDate(date, baseTz);
        const compOffset = tzDate(date, tz);
        const diffMinutes = compOffset - baseOffset;

        const offsetStr = formatOffsetISO(compOffset);
        const diffStr = formatOffsetDiff(diffMinutes);
        const relativeDay = getRelativeDay(date, baseTz, date, tz);

        const dstInfo = getDSTInfo(date, tz);
        const abbr = getTzAbbr(date, tz);

        let formattedDate = '';
        let formattedTime = '';
        let weekday = '';

        try {
            const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
            const parts = dtf.formatToParts(date);
            const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

            const hour = getVal('hour').padStart(2, '0');
            const minute = getVal('minute').padStart(2, '0');
            const second = getVal('second').padStart(2, '0');

            formattedTime = `${hour}:${minute}:${second}`;
            formattedDate = `${getVal('weekday')}, ${getVal('month')} ${getVal('day')}, ${getVal('year')}`;
            weekday = getVal('weekday');
        } catch {
            // Fallback
            formattedTime = date.toTimeString().split(' ')[0];
            formattedDate = date.toDateString();
            weekday = formattedDate.split(' ')[0];
        }

        const meta = this.timezoneMetaMap().get(tz) || parseTimezoneID(tz);

        return {
            timezone: tz,
            country: meta.country,
            city: meta.city,
            abbr: abbr || meta.abbr || 'UTC',
            formattedDate,
            formattedTime,
            ms: date.getMilliseconds().toString().padStart(3, '0'),
            offsetStr,
            diffMinutes,
            diffStr,
            relativeDay,
            isDSTActive: dstInfo.isDSTActive,
            hasDST: dstInfo.hasDST,
            relation: diffMinutes > 0 ? 'Ahead' : diffMinutes < 0 ? 'Behind' : 'Same',
            weekday
        };
    });

    timelineHours = computed(() => {
        const year = this.customYear();
        const month = this.customMonth();
        const day = this.customDay();
        const baseTz = this.baseTimezone();
        const compTz = this.comparedTimezone();
        const activeHour = this.customHour();

        const hoursArray = [];
        for (let h = 0; h < 24; h++) {
            const dateInTz = createDateInTimezone(baseTz, year, month, day, h, 0, 0, 0);

            // Format hour for base timezone (e.g. 9 AM)
            let baseLabel = `${h}:00`;
            try {
                const dtfBase = new Intl.DateTimeFormat('en-US', {
                    timeZone: baseTz,
                    hour: 'numeric',
                    hour12: true
                });
                baseLabel = dtfBase.format(dateInTz);
            } catch {
                // Fallback
                baseLabel = h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
            }

            // Format hour for compared timezone (e.g. 2:30 PM)
            let compLabel = '';
            let compHourVal = 0;
            try {
                const dtfComp = new Intl.DateTimeFormat('en-US', {
                    timeZone: compTz,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                compLabel = dtfComp.format(dateInTz);

                const dtfCompHour = new Intl.DateTimeFormat('en-US', {
                    timeZone: compTz,
                    hour: 'numeric',
                    hour12: false
                });
                compHourVal = Number.parseInt(dtfCompHour.format(dateInTz), 10);
            } catch {
                compLabel = `${h}:00`;
                compHourVal = h;
            }

            const isBaseSleep = h < 7 || h >= 22;
            const isCompSleep = compHourVal < 7 || compHourVal >= 22;

            let baseStatus = 'work';
            if (h < 7 || h >= 22) baseStatus = 'sleep';
            else if (h === 7 || h >= 18) baseStatus = 'personal';

            let compStatus = 'work';
            if (compHourVal < 7 || compHourVal >= 22) compStatus = 'sleep';
            else if (compHourVal === 7 || compHourVal >= 18) compStatus = 'personal';

            const isOverlapPerfect = baseStatus === 'work' && compStatus === 'work';
            const isOverlapGood = baseStatus !== 'sleep' && compStatus !== 'sleep';

            hoursArray.push({
                hour: h,
                baseLabel,
                compLabel,
                isBaseSleep,
                isCompSleep,
                baseStatus,
                compStatus,
                isOverlapPerfect,
                isOverlapGood,
                isActive: h === activeHour
            });
        }
        return hoursArray;
    });

    conversationalSummary = computed(() => {
        const baseT = this.baseTimeDetails();
        const compT = this.comparedTimeDetails();
        const baseHour = this.customHour();

        const formatDisplayTime = (timeStr: string) => {
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}`;
            }
            return timeStr;
        };

        const baseTimeStr = formatDisplayTime(baseT.formattedTime);
        const compTimeStr = formatDisplayTime(compT.formattedTime);

        let meetingStatus = 'Excellent Overlap';
        let meetingDesc = 'Both locations are in standard waking/business hours. Highly recommended for calls!';
        let meetingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        let meetingIcon = 'check_circle';

        const baseHourVal = baseHour;
        const compHourVal = Number.parseInt(compT.formattedTime.split(':')[0], 10);

        const baseIsSleep = baseHourVal < 7 || baseHourVal >= 22;
        const compIsSleep = compHourVal < 7 || compHourVal >= 22;

        if (baseIsSleep && compIsSleep) {
            meetingStatus = 'Sleeping Hours everywhere';
            meetingDesc = 'Both participants are typically asleep. Avoid scheduling.';
            meetingColor = 'text-slate-500 bg-slate-50 border-slate-200';
            meetingIcon = 'nights_stay';
        } else if (baseIsSleep) {
            meetingStatus = `${baseT.city} is asleep`;
            meetingDesc = `It is sleeping time in ${baseT.city} (${baseTimeStr}). Consider shifting earlier or later.`;
            meetingColor = 'text-amber-600 bg-amber-50 border-amber-200';
            meetingIcon = 'hotel';
        } else if (compIsSleep) {
            meetingStatus = `${compT.city} is asleep`;
            meetingDesc = `It is sleeping time in ${compT.city} (${compTimeStr}). Consider shifting earlier or later.`;
            meetingColor = 'text-amber-600 bg-amber-50 border-amber-200';
            meetingIcon = 'hotel';
        } else {
            const baseIsWork = baseHourVal >= 9 && baseHourVal < 17;
            const compIsWork = compHourVal >= 9 && compHourVal < 17;
            if (baseIsWork && compIsWork) {
                meetingStatus = 'Perfect Meeting Window';
                meetingDesc = 'Prime office hours overlap. Ideal time for business collaboration!';
                meetingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                meetingIcon = 'business';
            } else {
                meetingStatus = 'Convenient Window';
                meetingDesc = 'Waking hours overlap. Neither side is forced to work late or wake early.';
                meetingColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                meetingIcon = 'sentiment_satisfied_alt';
            }
        }

        return {
            baseTimeStr,
            compTimeStr,
            baseCity: baseT.city,
            compCity: compT.city,
            meetingStatus,
            meetingDesc,
            meetingColor,
            meetingIcon
        };
    });

    // --- TIMEZONE SEARCH & INSTANT FILTERING ---
    timezoneSearchResults = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        if (!query) return [];

        const list = this.timezoneList();
        return list
            .filter(tz => {
                return (
                    tz.timezone.toLowerCase().includes(query) ||
                    tz.country.toLowerCase().includes(query) ||
                    tz.city.toLowerCase().includes(query) ||
                    tz.abbr.toLowerCase().includes(query)
                );
            })
            .slice(0, 8); // Fast rendering of top 8 suggestions
    });

    selectComparedTimezone(tz: string) {
        this.comparedTimezone.set(tz);
        this.searchQuery.set('');
        this.showSearchDropdown.set(false);
        this.updateUrlQuery();
    }

    selectBaseTimezone(tz: string) {
        this.baseTimezone.set(tz);
        // Re-sync custom inputs if in manual conversion mode
        if (!this.isLiveMode()) {
            this.syncCustomInputs(this.baseDate(), tz);
        }
        this.updateUrlQuery();
    }

    // --- EXTRA INTERACTIVE FEATURES ---
    swapTimezones() {
        const base = this.baseTimezone();
        const comp = this.comparedTimezone();

        this.baseTimezone.set(comp);
        this.comparedTimezone.set(base);

        if (!this.isLiveMode()) {
            this.syncCustomInputs(this.baseDate(), comp);
        }
        this.updateUrlQuery();
    }

    // --- FAVORITES BOOKMARKING SYSTEM ---
    isFavorite(tz: string): boolean {
        return this.favorites().includes(tz);
    }

    toggleFavorite(tz: string) {
        const current = this.favorites();
        let updated: string[];

        if (current.includes(tz)) {
            updated = current.filter(x => x !== tz);
        } else {
            updated = [...current, tz];
        }

        this.favorites.set(updated);
        try {
            localStorage.setItem('fav_timezones', JSON.stringify(updated));
        } catch {
            // ignore security restrictions or full storage
        }
    }

    loadFavoritesFromStorage() {
        try {
            const stored = localStorage.getItem('fav_timezones');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.favorites.set(parsed);
                }
            }
        } catch {
            // Keep defaults
        }
    }

    // --- PERSISTENT STATE IN SHARE URL ---
    updateUrlQuery() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('base', this.baseTimezone());
            url.searchParams.set('comp', this.comparedTimezone());
            if (!this.isLiveMode()) {
                url.searchParams.set('mode', 'custom');
                url.searchParams.set('time', this.baseDate().getTime().toString());
            } else {
                url.searchParams.delete('mode');
                url.searchParams.delete('time');
            }
            window.history.replaceState({}, '', url.toString());
        } catch {
            // Standard sandboxed iframe fallback
        }
    }

    getShareableUrl(): string {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('base', this.baseTimezone());
            url.searchParams.set('comp', this.comparedTimezone());
            if (!this.isLiveMode()) {
                url.searchParams.set('mode', 'custom');
                url.searchParams.set('time', this.baseDate().getTime().toString());
            } else {
                url.searchParams.delete('mode');
                url.searchParams.delete('time');
            }
            return url.toString();
        } catch {
            return window.location.href;
        }
    }

    copyShareLink() {
        const link = this.getShareableUrl();
        this.copyToClipboard(link, 'Shareable planner URL copied to clipboard!');
    }

    loadStateFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const baseParam = params.get('base');
            const compParam = params.get('comp');
            const modeParam = params.get('mode');
            const timeParam = params.get('time');

            if (baseParam) {
                this.baseTimezone.set(baseParam);
            }
            if (compParam) {
                this.comparedTimezone.set(compParam);
            }
            if (modeParam === 'custom') {
                this.isLiveMode.set(false);
                if (timeParam) {
                    const parsedMs = Number.parseInt(timeParam, 10);
                    if (!Number.isNaN(parsedMs)) {
                        const dateObj = new Date(parsedMs);
                        this.baseDate.set(dateObj);
                        this.syncCustomInputs(dateObj, this.baseTimezone());
                    }
                }
            }
        } catch {
            // ignore iframe read errors
        }
    }

    // --- COPY QUICK UTILITIES ---
    copyToClipboard(text: string, message: string) {
        try {
            navigator.clipboard.writeText(text).then(() => {
            }).catch(() => {
                // Fallback for sandboxed frames
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                document?.body?.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch {
                }
                document?.body?.removeChild(textArea);
            });
        } catch {
        }
    }

    copyBaseDateTime() {
        const t = this.baseTimeDetails();
        const str = `${t.formattedDate} ${t.formattedTime}.${t.ms} (${t.abbr})`;
        this.copyToClipboard(str, 'Primary local date & time copied!');
    }

    copyISOString() {
        this.copyToClipboard(this.baseDate().toISOString(), 'ISO 8601 datetime copied!');
    }

    copyUTCString() {
        this.copyToClipboard(this.baseDate().toUTCString(), 'UTC standard time representation copied!');
    }

    resetAll() {
        try {
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (localTz) {
                this.baseTimezone.set(localTz);
                if (localTz === 'America/New_York') {
                    this.comparedTimezone.set('Europe/London');
                } else {
                    this.comparedTimezone.set('America/New_York');
                }
            }
        } catch {
            this.baseTimezone.set('UTC');
            this.comparedTimezone.set('America/New_York');
        }

        this.isLiveMode.set(true);
        this.searchQuery.set('');
        this.showSearchDropdown.set(false);
        this.baseDate.set(new Date());
        this.syncCustomInputs(new Date(), this.baseTimezone());

        // Clear search query parameters
        try {
            const url = new URL(window?.location?.href);
            url.search = '';
            window?.history?.replaceState({}, '', url.toString());
        } catch {
            // safe bypass
        }

    }
}
