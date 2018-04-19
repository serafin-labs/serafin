import * as _ from 'lodash';

/**
 * Modify the given object with the given patch.
 * The algorithm used is the one described for patch merge in the following RFC : @see https://tools.ietf.org/html/rfc7396.
 * /!\ This function mutate object.
 * 
 * @param target The source object. The patch is applied to this object
 * @param patch The patch to be applied
 */
export function jsonMergePatch(target, patch) {
    // if the provided target is not an object, we just return the patch
    if (!_.isObject(target)) {
        return patch
    }
    // loop over all the properties
    for (var property in patch) {
        if (_.isNull(patch[property])) {
            if (property in target) {
                // delete the property from the object
                delete target[property]
            }
        } else {
            // assign the patch value
            target[property] = jsonMergePatch(target[property], patch[property])
        }
    }
    return target
}