# Product

<!-- impeccable:product-schema 1 -->

## Platform

desktop (Tauri — Windows)

## Users

Primary user: the developer themselves. Personal use — scheduling Spotify music for their own daily routine (waking up, focus time, sleep, etc.). The app is a single-user personal tool, not a multi-tenant or team product.

## Product Purpose

Spotify Scheduler is a desktop tray app that lets the user schedule Spotify music to play or queue at specific times on specific days. It runs in the background via the system tray and fires automatically even when the window is closed. The core job is **queue management** — building and managing playlists/queues ahead of time so music is ready when needed, without manual intervention at the moment of playback.

Success means: the user sets up a schedule once, and the right music plays at the right time every week without them touching anything.

## Positioning

Spotify alone cannot schedule future playback. This app adds a persistent, background scheduler that lives in the system tray and fires automatically — like an alarm clock for music. The differentiator is the combination of: (1) persistent background execution via tray, (2) recurring weekly schedules with per-day selection, (3) both play-now and queue-up modes, and (4) shuffle support for variety.

## Operating Context

- The app runs as a Windows desktop application via Tauri
- It lives in the system tray; closing the window hides it but the scheduler keeps running
- The user interacts with it in short bursts: setting up schedules, searching for music, toggling schedules on/off
- Between interactions, the app is passive — it just fires notifications when schedules trigger
- The user's Spotify account is the source of truth for music library and playback
- Single-instance enforcement prevents duplicate schedulers

## Capabilities and Constraints

**Confirmed capabilities:**
- Create/edit/delete/duplicate schedules with: name, time (HH:MM), days of week, enabled/disabled, mode (play or queue), items (playlists/albums/tracks), shuffle toggle
- Search Spotify for tracks, albums, and playlists
- Add items to existing schedules or create new schedules from search results
- Run a schedule immediately (test)
- System tray integration with open/quit menu
- Desktop notifications on schedule fire (success or failure)
- Light/dark theme toggle
- Spotify OAuth login/logout
- Catch-up window: if the PC wakes from suspension within 2 minutes after the scheduled time, the schedule still fires
- Queue mode: adds tracks to the end of the current queue (up to 100 tracks per fire)
- Play mode: starts playing the selected item (replaces current playback)

**Durable constraints:**
- Must remain a system tray app that runs in background and fires even when window is closed
- Must remain Spotify-exclusive — no other music services
- Single-user, single-machine — no cloud sync or multi-device
- Portuguese (Brazilian) UI language

**Technical constraints:**
- Tauri v2 + React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui + Radix UI
- Geist Variable font
- Rust backend for scheduler, Spotify API calls, and state persistence
- State persisted to app data directory

## Brand Commitments

- App name: "Spotify Scheduler"
- UI language: Portuguese (Brazilian)
- No existing logo or brand assets beyond the app name
- The app icon uses a calendar+clock metaphor (CalendarClock icon)

## Evidence on Hand

- Fully functional app with working scheduler, Spotify integration, and tray
- Rust tests for scheduler logic (due key calculation, shuffle)
- No marketing assets, testimonials, or case studies exist
- No user research data beyond the developer's own usage

## Product Principles

1. **Set it and forget it** — once a schedule is created, it should work reliably without attention
2. **Background-first** — the app's primary value happens when the user is not looking at it
3. **Short interactions** — when the user does open the app, they should accomplish their task in seconds
4. **Trust through feedback** — every action (fire, error, success) should be visible through notifications and toasts
5. **Personal tool, not platform** — optimize for one person's daily routine, not for scalability or multi-user features

## Accessibility & Inclusion

- Uses shadcn/ui which provides Radix UI primitives with ARIA support
- Keyboard navigation via Radix UI components
- No specific accessibility requirements established beyond standard desktop app conventions
