import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';
import { EnvConfig } from './env.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, '../../package.json');

export class VersionConfig {
    static #packageVersion = null;

    static get packageVersion() {
        if (!VersionConfig.#packageVersion) {
            const raw = fs.readFileSync(pkgPath, 'utf8');
            const pkg = JSON.parse(raw);
            VersionConfig.#packageVersion = pkg.version || '1.0.0';
        }
        return VersionConfig.#packageVersion;
    }

    static validateAndGetPrefix() {
        const version = VersionConfig.packageVersion;
        if (!semver.valid(version)) {
            throw new Error(`La versión en package.json (${version}) no cumple con SemVer.`);
        }

        const major = semver.major(version);
        const prefix = EnvConfig.apiPrefix;
        const expectedSegment = `/v${major}`;

        if (!prefix.endsWith(expectedSegment)) {
            throw new Error(
                `Inconsistencia SemVer: package.json es v${version} (major ${major}), pero API_PREFIX es '${prefix}'. Debe terminar en '${expectedSegment}'.`
            );
        }

        return prefix;
    }
}

export const apiPrefix = VersionConfig.validateAndGetPrefix();
export const appVersion = VersionConfig.packageVersion;
