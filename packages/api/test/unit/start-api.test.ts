import { registerServices } from '#~/di/register-services';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';
import { StartupTaskRunner } from '#~/features/startup/startup-task.runner';
import { startApi } from '#~/start-api';

vi.mock('#~/di/register-services', { spy: true });

describe('startApi', () => {
  it('starts again after a failed start instead of keeping the failure', async () => {
    vi.spyOn(StartupTaskRunner.prototype, 'run').mockResolvedValue();
    vi.mocked(registerServices).mockRejectedValueOnce(new Error('binding not ready'));

    await expect(startApi()).rejects.toThrow('binding not ready');
    const handler = await startApi();

    expect(handler).toBeInstanceOf(ApiRequestHandler);
    expect(registerServices).toHaveBeenCalledTimes(2);
    expect(await startApi()).toBe(handler);
  });
});
