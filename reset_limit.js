const fs = require('fs');
const path = require('path');
const { getPath } = require('./pathConfig');

const COMPLETED_APPS_PATH = getPath('completed_apps.json');
const ACTIVE_APPS_PATH = getPath('active_apps.json');
const TARGET_USER_ID = '982731220913913856';

console.log('--- MM Application Reset Tool ---');

// 1. Reset Completed Apps
if (fs.existsSync(COMPLETED_APPS_PATH)) {
    try {
        let completed = JSON.parse(fs.readFileSync(COMPLETED_APPS_PATH, 'utf8'));
        if (Array.isArray(completed) && completed.includes(TARGET_USER_ID)) {
            const newCompleted = completed.filter(id => id !== TARGET_USER_ID);
            fs.writeFileSync(COMPLETED_APPS_PATH, JSON.stringify(newCompleted, null, 2));
            console.log(`✅ Removed ${TARGET_USER_ID} from completed_apps.json`);
        } else {
            console.log(`ℹ️ User ${TARGET_USER_ID} not found in completed_apps.json`);
        }
    } catch (e) {
        console.error('❌ Error processing completed_apps.json:', e.message);
    }
} else {
    console.log('ℹ️ completed_apps.json does not exist yet.');
}

// 2. Reset Active Apps (In-progress)
if (fs.existsSync(ACTIVE_APPS_PATH)) {
    try {
        let apps = JSON.parse(fs.readFileSync(ACTIVE_APPS_PATH, 'utf8'));
        if (apps[TARGET_USER_ID]) {
            delete apps[TARGET_USER_ID];
            fs.writeFileSync(ACTIVE_APPS_PATH, JSON.stringify(apps, null, 2));
            console.log(`✅ Removed ${TARGET_USER_ID} from active_apps.json`);
        } else {
            console.log(`ℹ️ User ${TARGET_USER_ID} not found in active_apps.json`);
        }
    } catch (e) {
        console.error('❌ Error processing active_apps.json:', e.message);
    }
} else {
    console.log('ℹ️ active_apps.json does not exist yet.');
}

console.log('--- Reset Complete ---');
