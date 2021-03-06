import { platform } from 'os';

const VOLUME = /^([A-Z]:)/i;
const IS_WINDOWS = platform() === 'win32';

function matches(pattern, importee) {
  if (pattern instanceof RegExp) {
    return pattern.test(importee);
  }
  if (importee.length < pattern.length) {
    return false;
  }
  if (importee === pattern) {
    return true;
  }
  const importeeStartsWithKey = importee.indexOf(pattern) === 0;
  const importeeHasSlashAfterKey = importee.substring(pattern.length)[0] === '/';
  return importeeStartsWithKey && importeeHasSlashAfterKey;
}

function getEntries(entries) {
  if (!entries) {
    return [];
  }

  if (Array.isArray(entries)) {
    return entries;
  }

  return Object.entries(entries).map(([key, value]) => {
    return { find: key, replacement: value };
  });
}

function getCustomResolver(customResolver, options) {
  if (typeof customResolver === 'function') {
    return customResolver;
  }
  if (customResolver && typeof customResolver.resolveId === 'function') {
    return customResolver.resolveId;
  }
  if (typeof options.customResolver === 'function') {
    return options.customResolver;
  }
  if (options.customResolver && typeof options.customResolver.resolveId === 'function') {
    return options.customResolver.resolveId;
  }
  return null;
}


function normalizeId(id) {
  if (typeof id === 'string' && (IS_WINDOWS || VOLUME.test(id))) {
    return slash(id.replace(VOLUME, ''));
  }
  return id;
}

export function aliasExternal(moduleName, inputEntries) {
  const entries = getEntries(inputEntries);

  if (entries.length === 0) {
    return {
      name: 'alias',
      resolveId: noop
    };
  }

  return {
    name: 'rollup-plugin-aliasexternal',
    buildStart(inputOptions) {
      return Promise.all(
        [...entries, inputEntries].map(
          ({ customResolver }) =>
            customResolver &&
            typeof customResolver === 'object' &&
            typeof customResolver.buildStart === 'function' &&
            customResolver.buildStart.call(this, inputOptions)
        )
      ).then(() => {
        // enforce void return value
      });
    },
    resolveId ( importee, importer, options, moduleSideEffects, syntheticNamedExports, meta ) {
      if (importer && importer.match('/'+moduleName+'/')) {
        const importeeId = normalizeId(importee);
        const importerId = normalizeId(importer);

        // First match is supposed to be the correct one
        const matchedEntry = entries.find((entry) => matches(entry.find, importeeId));
        if (!matchedEntry || !importerId) {
          return null;
        }

        const updatedId = normalizeId(
          importeeId.replace(matchedEntry.find, matchedEntry.replacement)
        );

        const customResolver = getCustomResolver(matchedEntry, inputEntries);
        if (customResolver) {
          return customResolver.call(this, updatedId, importerId, {});
        }
        
        const final =  this.resolve(updatedId, importer, { skipSelf: true }).then((resolved) => {
          let finalResult = resolved;
          if (!finalResult) {
            finalResult = { id: updatedId };
          }
          return finalResult;
        });
        return final;
      }
      return null;
    },
  };
}