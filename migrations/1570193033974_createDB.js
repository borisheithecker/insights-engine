exports.shorthands = undefined;

exports.up = (pgm) => {

    pgm.createExtension('uuid-ossp', { ifNotExists: true });

    pgm.createTable('actor', {
        insights_id: { 
            type: 'uuid',
            primaryKey: true,
            notNull: true
        },
        school_id: {
            type: 'varchar(24)',
            notNull: true
        },
        roles: {
            type: 'text',
            notNull: true
        },
    });
    pgm.createIndex('actor', 'insights_id');

    pgm.createTable('activity', {
        id: {
            type: 'uuid',
            primaryKey: true,
            notNull: true,
            default: pgm.func('uuid_generate_v4()')
        },
        actor: { 
            type: 'uuid',
            notNull: true
        },
        verb: {
            type: 'varchar(24)',
            notNull: true
        },
        object: {
            type: 'varchar(200)',
            notNull: true
        },
        context: {
            type: 'json',
            notNull: true
        },
        time: {
            type: 'timestamp',
            notNull: true
        }
    });
    pgm.createIndex('activity', 'id');
};
