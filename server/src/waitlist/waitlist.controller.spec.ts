import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ResourceType, Role } from '../../generated/prisma/client.js';
import { WaitlistController } from './waitlist.controller.js';

const user = { userId: 'u1', email: 'u@x.com', role: Role.STUDENT };

describe('WaitlistController', () => {
  let controller: WaitlistController;
  let waitlist: {
    myEntries: jest.Mock;
    positionFor: jest.Mock;
    queue: jest.Mock;
    promote: jest.Mock;
    dismiss: jest.Mock;
  };

  beforeEach(() => {
    waitlist = {
      myEntries: jest.fn(),
      positionFor: jest.fn(),
      queue: jest.fn(),
      promote: jest.fn(),
      dismiss: jest.fn(),
    };
    controller = new WaitlistController(waitlist as any);
  });

  it('GET /waitlist/me returns own entries', () => {
    controller.myEntries(user);
    expect(waitlist.myEntries).toHaveBeenCalledWith('u1');
  });

  it('GET /waitlist/position/:bookingId wraps the position', async () => {
    waitlist.positionFor.mockResolvedValue(4);
    await expect(controller.position('b1')).resolves.toEqual({ position: 4 });
    expect(waitlist.positionFor).toHaveBeenCalledWith('b1');
  });

  it('GET queue delegates with resource type and key', () => {
    controller.queue(ResourceType.BOOK, 'title-1');
    expect(waitlist.queue).toHaveBeenCalledWith(ResourceType.BOOK, 'title-1');
  });

  it('POST promote passes staff notes', () => {
    controller.promote('w1', { staffNotes: 'ok' });
    expect(waitlist.promote).toHaveBeenCalledWith('w1', 'ok');
  });

  it('POST dismiss passes staff notes', () => {
    controller.dismiss('w1', { staffNotes: 'no' });
    expect(waitlist.dismiss).toHaveBeenCalledWith('w1', 'no');
  });

  it('promote tolerates a missing body', () => {
    controller.promote('w1', {});
    expect(waitlist.promote).toHaveBeenCalledWith('w1', undefined);
  });
});
