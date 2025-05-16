/**
 * Error messages for part operations
 */
export const PART_ERRORS = {
    NOT_FOUND: 'Part not found',
    VERSION_NOT_FOUND: 'Part version not found',
    DUPLICATE_NUMBER: 'Part number already exists',
    VERSION_EXISTS: 'Part version already exists',
    HAS_CHILDREN: 'Part cannot be deleted as it is used in other assemblies',
    INVALID_STATUS: 'Invalid part status',
    INVALID_VERSION: 'Invalid version format',
    ATTACHMENT_ERROR: 'Error with part attachment operation',
    REPRESENTATION_ERROR: 'Error with part representation operation',
    TAG_ERROR: 'Error with part tag operation',
    COMPLIANCE_ERROR: 'Error with part compliance operation',
    VALIDATION_ERROR: 'Part validation error',
    CUSTOM_FIELD_ERROR: 'Error with part custom field operation',
    STRUCTURE_ERROR: 'Error with part structure operation',
    GENERAL_ERROR: 'An error occurred during the part operation',
    SELF_REFERENCE: 'A part cannot be a child of itself',
    CIRCULAR_REFERENCE: 'Adding this relationship would create a circular reference',
    STRUCTURE_NOT_FOUND: 'Part structure relationship not found',
    DUPLICATE_STRUCTURE: 'This parent-child relationship already exists'
};