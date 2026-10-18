import { FORM_ERROR_KINDS, FORM_ERROR_SOURCES } from '#~/constants/ux-primitives';
import { getFormErrorMessages, mapServerFormErrors } from '#~/utils/forms/form-error';

describe('getFormErrorMessages', () => {
  it('reads messages from strings, errors and message holders and drops duplicates', () => {
    const messages = getFormErrorMessages(['Required', new Error('Required'), { message: ' Too short ' }]);

    expect(messages).toEqual(['Required', 'Too short']);
  });

  it('falls back to a generic message for errors without readable text', () => {
    expect(getFormErrorMessages([{}, 42])).toEqual(['Please check this value.']);
  });
});

describe('mapServerFormErrors', () => {
  it('maps field errors to the form field names and hides the raw server text', () => {
    const [item] = mapServerFormErrors(
      { fieldErrors: { display_name: ['internal detail'] } },
      { fieldNames: { display_name: 'displayName' }, fallbackMessage: 'Check the display name.' },
    );

    expect(item).toEqual({
      field: 'displayName',
      kind: FORM_ERROR_KINDS.FIELD,
      message: 'Check the display name.',
      source: FORM_ERROR_SOURCES.SERVER_MAPPING,
    });
  });

  it('uses the message registered for a server error code', () => {
    const [item] = mapServerFormErrors({ code: 'EMAIL_TAKEN' }, { messageByCode: { EMAIL_TAKEN: 'Email is taken.' } });

    expect(item).toMatchObject({ kind: FORM_ERROR_KINDS.FORM, message: 'Email is taken.' });
  });
});
