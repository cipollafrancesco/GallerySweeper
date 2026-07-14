/**
 * Node's native ESM resolver requires explicit file extensions, but this
 * codebase (like the rest of the TS/Metro ecosystem) imports siblings
 * extensionlessly (`from './hashCore'`, not `from './hashCore.ts'`). This hook
 * falls back to appending `.ts` when a bare relative specifier fails to
 * resolve, so `npm test` (`node --test`) can run the pure `services/duplicates/`
 * modules directly with zero new dependencies (no ts-node/tsx). Registered via
 * scripts/registerTsExtensionResolver.mjs, passed to `node --import`.
 */
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        const isBareRelative = (specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-zA-Z]+$/.test(specifier);
        if (err?.code === 'ERR_MODULE_NOT_FOUND' && isBareRelative) {
            return nextResolve(`${specifier}.ts`, context);
        }
        throw err;
    }
}
