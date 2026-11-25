import test from 'node:test';
import assert from 'node:assert/strict';
import {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    DatabaseError
} from '../src/utils/app-error.js';
import { OpticalTelemetryClassifier } from '../src/utils/optical-classifier.js';
import { BaseDTO } from '../src/core/base.dto.js';
import { UserDTO } from '../src/dtos/user.dto.js';
import { OnuDTO, NapBoxDTO } from '../src/dtos/topology.dto.js';

test('OOP Polymorphic AppError hierarchy inherits from Error and serializes cleanly', () => {
    const baseErr = new AppError('Fallo interno', 500);
    assert.ok(baseErr instanceof Error);
    assert.ok(baseErr instanceof AppError);
    assert.equal(baseErr.statusCode, 500);
    assert.equal(baseErr.status, 'Error');

    const validationErr = new ValidationError('DPI inválido', [{ field: 'dpi', message: '13 dígitos requeridos' }]);
    assert.ok(validationErr instanceof AppError);
    assert.equal(validationErr.statusCode, 400);
    assert.equal(validationErr.status, 'Fail');
    assert.equal(validationErr.toJSON().errors.length, 1);

    const notFoundErr = new NotFoundError('Caja NAP', 'NAP-Z10-R01');
    assert.ok(notFoundErr instanceof AppError);
    assert.equal(notFoundErr.statusCode, 404);
    assert.equal(notFoundErr.toJSON().resource, 'Caja NAP');

    const dbErr = DatabaseError.fromMySQLError({
        sqlState: '45000',
        sqlMessage: 'La Caja NAP seleccionada ya tiene todos sus puertos ópticos ocupados.'
    });
    assert.ok(dbErr instanceof AppError);
    assert.equal(dbErr.statusCode, 400);
    assert.equal(dbErr.toJSON().sqlState, '45000');

    const dupErr = DatabaseError.fromMySQLError({ code: 'ER_DUP_ENTRY' });
    assert.ok(dupErr instanceof ConflictError);
    assert.equal(dupErr.statusCode, 409);

    const authErr = new UnauthorizedError();
    const forbiddenErr = new ForbiddenError();
    assert.equal(authErr.statusCode, 401);
    assert.equal(forbiddenErr.statusCode, 403);
});

test('OpticalTelemetryClassifier deterministically evaluates GPON dBm thresholds', () => {
    const optimal = OpticalTelemetryClassifier.evaluateRxPower(-18.4);
    assert.equal(optimal.onuStatus, 'online');
    assert.equal(optimal.opticalHealth, 'optimal');

    const warning = OpticalTelemetryClassifier.evaluateRxPower(-26.8);
    assert.equal(warning.onuStatus, 'high_attenuation');
    assert.equal(warning.opticalHealth, 'warning');

    const criticalLos = OpticalTelemetryClassifier.evaluateRxPower(-40.0);
    assert.equal(criticalLos.onuStatus, 'los');
    assert.equal(criticalLos.opticalHealth, 'critical');
    assert.equal(criticalLos.packetLossPct, 100);
});

test('Polymorphic DTOs inherit from BaseDTO, sanitize credentials and compute derived fields', () => {
    const userDto = UserDTO.from({
        id_user: 1,
        dpi: '3011458920101',
        first_name: 'Henrik Anderson',
        last_name: 'Oloroso García',
        phone: '55102030',
        email: 'admin@orionlink.gt',
        password_hash: '$2b$10$secret_hash_never_exposed',
        role: 'admin',
        is_active: 1,
        created_at: '2026-11-25T08:00:00Z'
    });

    assert.equal(userDto.id, 1);
    assert.equal(userDto.fullName, 'Henrik Anderson Oloroso García');
    assert.equal(userDto.password_hash, undefined);
    assert.equal(userDto.isActive, true);

    const napDto = NapBoxDTO.from({
        id_nap_box: 1,
        id_olt: 1,
        pon_port_number: 1,
        nap_code: 'NAP-Z10-R01',
        zone_sector: 'Zona 10',
        address_reference: 'Poste #1042',
        latitude: 14.60112,
        longitude: -90.51489,
        splitter_ratio: '1:8',
        total_ports: 8,
        occupied_ports: 3,
        status: 'operational'
    });
    assert.equal(napDto.availablePorts, 5);

    const onuDto = OnuDTO.from({
        id_onu: 3,
        id_nap_box: 1,
        nap_port_number: 3,
        serial_number: 'HWTC8A91B003',
        mac_address: 'C8:3A:35:91:B0:03',
        model: 'Huawei OptiXstar',
        rx_power_dbm: -26.8,
        tx_power_dbm: 1.95,
        optical_status: 'high_attenuation',
        last_telemetry_at: '2026-11-25T08:00:00Z'
    });
    assert.ok(onuDto instanceof Object);
    assert.equal(onuDto.opticalHealth, 'warning');
});
