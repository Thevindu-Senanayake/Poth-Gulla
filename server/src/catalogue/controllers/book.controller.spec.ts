import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BookController } from './book.controller.js';

describe('BookController', () => {
  let controller: BookController;
  let books: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    addCopy: jest.Mock;
    retireCopy: jest.Mock;
  };

  beforeEach(() => {
    books = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addCopy: jest.fn(),
      retireCopy: jest.fn(),
    };
    controller = new BookController(books as any);
  });

  describe('GET /catalogue/books', () => {
    it('parses paging and search and reshapes the tuple result', async () => {
      books.findMany.mockResolvedValue([[{ id: 't1' }], 1]);
      const req = { user: { role: 'STUDENT' } };
      const res = await controller.findAll(
        req as any,
        '2',
        '15',
        'sql',
        'cat1',
      );
      expect(books.findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        search: 'sql',
        categoryId: 'cat1',
        showHidden: false, // STUDENT role → no hidden books
      });
      expect(res).toEqual({ data: [{ id: 't1' }], total: 1, page: 2 });
    });

    it('clamps limit to 100', async () => {
      books.findMany.mockResolvedValue([[], 0]);
      const req = { user: { role: 'ADMIN' } };
      await controller.findAll(req as any, '1', '250');
      expect(books.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, showHidden: true }), // ADMIN sees hidden
      );
    });
  });

  it('GET /catalogue/books/:id delegates to findById with role-based visibility', () => {
    controller.findOne('t1', { user: { role: 'STUDENT' } } as any);
    expect(books.findById).toHaveBeenCalledWith('t1', false);
    controller.findOne('t1', { user: { role: 'LIBRARY_STAFF' } } as any);
    expect(books.findById).toHaveBeenCalledWith('t1', true);
  });

  it('POST /catalogue/books creates', () => {
    const dto = { title: 'T', author: 'A' } as any;
    controller.create(dto);
    expect(books.create).toHaveBeenCalledWith(dto);
  });

  it('PATCH /catalogue/books/:id updates', () => {
    const dto = { title: 'New' } as any;
    controller.update('t1', dto);
    expect(books.update).toHaveBeenCalledWith('t1', dto);
  });

  it('DELETE /catalogue/books/:id removes', () => {
    controller.remove('t1');
    expect(books.remove).toHaveBeenCalledWith('t1');
  });

  it('POST /catalogue/books/:id/copies adds a copy', () => {
    controller.addCopy('t1', { assetTag: 'A-001' });
    expect(books.addCopy).toHaveBeenCalledWith('t1', 'A-001');
  });

  it('DELETE /catalogue/copies/:id retires a copy', () => {
    controller.retireCopy('c1');
    expect(books.retireCopy).toHaveBeenCalledWith('c1');
  });
});
