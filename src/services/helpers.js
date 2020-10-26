import each from 'lodash/each'

/**
 * Return an array of pattern keys that match needle.
 *
 * @param {string} needle
 * @param {{}} patterns
 * @param {boolean} all
 */
function matchAny (needle, patterns, all = false) {
    const matched = [];

    // Iterate patterns and return key of first match
    each(patterns, (v, i) => {
        if (needle.match(v)) {
            matched.push(i)

            if (!all) {
                return false
            }
        }

        return true
    });

    if (!all && !matched.length) {
        return false;
    }

    return all ? matched : matched[0];
}

const dummy = {}

export {
    dummy,
    matchAny
}