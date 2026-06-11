// helpers.js - shared subroutines for Lib2Doc and Doc2Lib
// Copyright (c) 2026 Kris Coppieters
// SPDX-License-Identifier: MIT

function getRequireFunction() {
    if (typeof globalThis != 'undefined' && typeof globalThis.require == 'function') {
        return globalThis.require;
    }

    if (typeof require == 'function') {
        return require;
    }

    throw new Error('require() is unavailable.');
}

function getFsModule() {
    return getRequireFunction()('fs');
}

function getUxpFs() {
    return getRequireFunction()('uxp').storage.localFileSystem;
}

function getOsModule() {
    return getRequireFunction()('os');
}

function getDefaultInDesignAssetsFolderEntry() {
    var fs = getUxpFs();
    var os = getOsModule();
    var homePath = String(os.homedir() || '').replace(/\\/g, '/');

    if (!homePath) {
        throw new Error('os.homedir() returned an empty path.');
    }

    return fs.getEntryWithUrl('file://' + homePath + '/Documents');
}

function getInDesignApp() {
    var moduleRequire = getRequireFunction();
    var indesign = null;

    if (typeof globalThis != 'undefined' && globalThis.app) {
        return globalThis.app;
    }

    indesign = moduleRequire('indesign');
    if (!indesign || !indesign.app) {
        throw new Error('InDesign app is unavailable.');
    }

    if (typeof globalThis != 'undefined') {
        globalThis.app = indesign.app;
    }

    return indesign.app;
}

function normalizePath(filePath) {
    var normalized = String(filePath || '').trim().replace(/\\/g, '/');

    if (normalized.indexOf('file:///') === 0) {
        normalized = normalized.substring('file:///'.length - 1);
    } else if (normalized.indexOf('file://') === 0) {
        normalized = normalized.substring('file://'.length);
    }

    normalized = normalized.replace(/%20/g, ' ');
    normalized = normalized.replace(/\/+/g, '/');

    return normalized;
}

function basename(filePath) {
    var normalized = normalizePath(filePath);
    var slashIndex = normalized.lastIndexOf('/');

    return slashIndex < 0 ? normalized : normalized.slice(slashIndex + 1);
}

function dirname(filePath) {
    var normalized = normalizePath(filePath);
    var slashIndex = normalized.lastIndexOf('/');

    if (slashIndex <= 0) {
        return '/';
    }

    return normalized.slice(0, slashIndex);
}

function replaceExtension(filePath, nextExtension) {
    return String(filePath || '').replace(/\.[^.\/]+$/, '') + nextExtension;
}

function ensureAbsolutePath(filePath) {
    var normalized = normalizePath(filePath);

    if (/^(\/|[A-Za-z]:\/)/.test(normalized)) {
        return normalized;
    }

    throw new Error('Expected an absolute path, got: ' + filePath);
}

function pathExists(targetPath) {
    var fs = getFsModule();

    try {
        if (typeof fs.statSync == 'function') {
            fs.statSync(targetPath);
            return true;
        }

        if (typeof fs.lstatSync == 'function') {
            fs.lstatSync(targetPath);
            return true;
        }

        if (typeof fs.accessSync == 'function') {
            fs.accessSync(targetPath);
            return true;
        }
    }
    catch (err) {
        return false;
    }

    return false;
}

function deleteFileIfAllowed(targetPath, overwrite) {
    var fs = getFsModule();

    if (!pathExists(targetPath)) {
        return;
    }

    if (!overwrite) {
        throw new Error('Target already exists: ' + targetPath);
    }

    if (typeof fs.unlinkSync != 'function') {
        throw new Error('fs.unlinkSync is unavailable for path: ' + targetPath);
    }

    fs.unlinkSync(targetPath);
}

function getPathFromEntry(entry) {
    if (!entry || !entry.nativePath) {
        throw new Error('No native path available from picker entry.');
    }

    return ensureAbsolutePath(entry.nativePath);
}

function prepareTargetPathForWrite(targetSelection, overwrite) {
    var entry = targetSelection && targetSelection.entry ? targetSelection.entry : null;
    var targetPath = targetSelection && targetSelection.targetPath ? targetSelection.targetPath : '';

    if (!targetPath) {
        throw new Error('No target path resolved.');
    }

    if (targetSelection.wasChosenInteractively) {
        if (!entry || typeof entry.delete != 'function') {
            return Promise.resolve();
        }

        return Promise.resolve(entry.delete()).catch(function(err) {
            throw new Error('Failed deleting picker-created target: ' + targetPath + ': ' + err);
        });
    }

    deleteFileIfAllowed(targetPath, overwrite);
    return Promise.resolve();
}

module.exports = {
    getRequireFunction: getRequireFunction,
    getFsModule: getFsModule,
    getUxpFs: getUxpFs,
    getOsModule: getOsModule,
    getDefaultInDesignAssetsFolderEntry: getDefaultInDesignAssetsFolderEntry,
    getInDesignApp: getInDesignApp,
    normalizePath: normalizePath,
    basename: basename,
    dirname: dirname,
    replaceExtension: replaceExtension,
    ensureAbsolutePath: ensureAbsolutePath,
    pathExists: pathExists,
    deleteFileIfAllowed: deleteFileIfAllowed,
    getPathFromEntry: getPathFromEntry,
    prepareTargetPathForWrite: prepareTargetPathForWrite
};
