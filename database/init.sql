SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS real_estate
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE real_estate;

CREATE TABLE IF NOT EXISTS properties (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  area DECIMAL(8, 2) NOT NULL,
  address VARCHAR(255) NOT NULL,
  property_type ENUM('house', 'apartment', 'land') NOT NULL,
  description VARCHAR(500) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_property_type (property_type),
  INDEX idx_property_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO properties
  (name, image_url, price, area, address, property_type, description)
VALUES
  (
    'Nhà phố hiện đại gần công viên',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    5200000000, 88, 'Quận 9, Thành phố Hồ Chí Minh', 'house',
    'Nhà thiết kế hiện đại, nhiều ánh sáng tự nhiên, gần trường học và công viên.'
  ),
  (
    'Căn hộ 2 phòng ngủ view thành phố',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
    2850000000, 72, 'Quận Bình Thạnh, Thành phố Hồ Chí Minh', 'apartment',
    'Căn hộ thoáng sáng, có ban công và tiện ích nội khu đầy đủ.'
  ),
  (
    'Đất nền khu dân cư yên tĩnh',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
    1900000000, 100, 'Thành phố Thủ Đức, Thành phố Hồ Chí Minh', 'land',
    'Lô đất vuông vức trong khu dân cư hiện hữu, đường trước nhà rộng.'
  ),
  (
    'Nhà vườn nhỏ phong cách tối giản',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=80',
    4300000000, 120, 'Thành phố Dĩ An, Bình Dương', 'house',
    'Không gian xanh yên tĩnh, phù hợp với gia đình cần nơi ở thoải mái.'
  ),
  (
    'Căn hộ tiện nghi gần trung tâm',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80',
    3600000000, 85, 'Quận 7, Thành phố Hồ Chí Minh', 'apartment',
    'Căn hộ nội thất sáng màu, gần siêu thị, trường học và trục giao thông chính.'
  );
