import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CategoryType } from '../../../generated/prisma/client.js';
import { CategoryController } from './category.controller.js';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categories: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    categories = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new CategoryController(categories as any);
  });

  it('GET passes the type filter through', () => {
    controller.findAll(CategoryType.BOOK);
    expect(categories.findAll).toHaveBeenCalledWith(CategoryType.BOOK);
  });

  it('GET with no type passes undefined', () => {
    controller.findAll();
    expect(categories.findAll).toHaveBeenCalledWith(undefined);
  });

  it('POST creates a category', () => {
    const dto = { name: 'Fiction', type: CategoryType.BOOK } as any;
    controller.create(dto);
    expect(categories.create).toHaveBeenCalledWith(dto);
  });

  it('PATCH updates a category', () => {
    controller.update('c1', { name: 'Sci-Fi' });
    expect(categories.update).toHaveBeenCalledWith('c1', { name: 'Sci-Fi' });
  });

  it('DELETE removes a category', () => {
    controller.remove('c1');
    expect(categories.remove).toHaveBeenCalledWith('c1');
  });
});
