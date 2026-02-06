# Bug Analysis: Infinite Auto-Selection Loop

## Problem Description
When logging into the dashboard, the system repeatedly logs:
```
✅ User focusedovp selected guild: Supreme〡MM
```
This happens multiple times and causes automatic page refreshes in an infinite loop.

## Root Cause Analysis

### Issue 1: Missing Dependency in useEffect (ServerSelector.jsx, line 31)
```javascript
useEffect(() => {
  const fetchGuilds = async () => {
    // ...
    if (!selectedGuild && data.length > 0) {
      handleSelectGuild(data[0], true);
    }
  };
  fetchGuilds();
}, []); // ❌ Missing selectedGuild dependency
```

**Problem**: The `useEffect` has an empty dependency array `[]`, but it references `selectedGuild` in its condition. This means:
- Every time the component re-renders, `selectedGuild` might change
- But the effect doesn't re-run to check this new value
- This can cause the auto-select logic to trigger incorrectly

### Issue 2: Auto-Select Logic Flaw (ServerSelector.jsx, lines 59-62)
```javascript
// If only one guild, don't show selector
if (guilds.length === 1 && !selectedGuild) {
  handleSelectGuild(guilds[0]);  // ❌ Missing isAutoSelect parameter
  return null;
}
```

**Problem**: When there's only one guild, it calls `handleSelectGuild` without the `isAutoSelect` parameter, which means:
- `isAutoSelect` defaults to `false`
- Line 44-46 in `handleSelectGuild` will call `onGuildChange(guild)` 
- This triggers a full page reload via `window.location.reload()` (Sidebar.jsx, line 13)
- After reload, the component mounts again, and the cycle repeats infinitely

### Issue 3: Page Reload on Guild Change (Sidebar.jsx, lines 10-14)
```javascript
const handleGuildChange = (guild) => {
  setSelectedGuild(guild);
  // Trigger a page refresh to reload data for the new guild
  window.location.reload();  // ❌ Causes infinite loop
};
```

**Problem**: The `window.location.reload()` causes the entire app to reload:
1. User logs in → ServerSelector mounts
2. Auto-selects first guild → Calls `onGuildChange`
3. Page reloads → ServerSelector mounts again
4. `selectedGuild` is reset to `null` (state is lost on reload)
5. Auto-selects first guild again → Loop continues

### Issue 4: State Loss on Page Reload
When `window.location.reload()` is called:
- All React state is lost, including `selectedGuild`
- The session storage on the backend (`req.session.selectedGuildId`) is set correctly
- But the frontend doesn't read this value on initial load
- So the frontend always thinks no guild is selected

## The Complete Loop Sequence

1. **User logs in** → Dashboard loads
2. **ServerSelector mounts** → `selectedGuild` is `null`
3. **fetchGuilds runs** → Gets guilds from API
4. **Auto-select triggers** (line 19-21) → Calls `handleSelectGuild(data[0], true)`
5. **Backend logs** "✅ User selected guild" → Sets session
6. **BUT** `isAutoSelect=true` → So `onGuildChange` is NOT called (line 44-46)
7. **Single guild check** (line 59-62) → Calls `handleSelectGuild(guilds[0])` WITHOUT `isAutoSelect`
8. **This time** `isAutoSelect=false` → Calls `onGuildChange(guild)`
9. **Page reloads** → Back to step 1

## Why It Logs Multiple Times
The backend logs every time `/api/dashboard/select-guild` is called. The loop causes this endpoint to be hit repeatedly, generating the spam logs.

## Solution Required
1. Fix the auto-select logic to prevent calling `handleSelectGuild` twice
2. Remove or conditionally use `window.location.reload()`
3. Add proper dependency array to useEffect
4. Persist and restore `selectedGuild` state from backend session
5. Prevent auto-selection if a guild is already selected in the session
