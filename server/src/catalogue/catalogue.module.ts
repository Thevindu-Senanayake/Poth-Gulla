import { Module } from '@nestjs/common';
import { BookController } from './controllers/book.controller.js';
import { CategoryController } from './controllers/category.controller.js';
import { DeviceController } from './controllers/device.controller.js';
import { RoomController } from './controllers/room.controller.js';
import { BookService } from './services/book.service.js';
import { CategoryService } from './services/category.service.js';
import { DeviceService } from './services/device.service.js';
import { RoomService } from './services/room.service.js';

@Module({
  controllers: [
    CategoryController,
    BookController,
    DeviceController,
    RoomController,
  ],
  providers: [CategoryService, BookService, DeviceService, RoomService],
})
export class CatalogueModule {}
