import math

WHITE = [255, 255, 255]

class PrivateZone:

	def __init__(self, zoneData, zone_id): #x, y, width, height, rotation, color):
		self.x = float(zoneData["pos"][0])
		self.y = float(zoneData["pos"][1])
		self.width = float(zoneData["size"][0])
		self.height = float(zoneData["size"][1])
		self.rotation = float(zoneData["r"])
		self.color = tuple(zoneData["color"])
		self.zone_id = zone_id
		self.pieces = set()

	def get_json_obj(self):
		return {
			"pos" : [
				self.x,
				self.y
			],
			"size" : [
				self.width,
				self.height
			],
			"r" : self.rotation,
			"color" : list(self.color),
			"id" : self.zone_id
		}

	def contains(self, x, y):
		ax = self.x + ((self.height / 2.0) * -math.sin(self.rotation) - (self.width / 2.0) * math.cos(self.rotation))
		ay = self.y + ((self.height / 2.0) * math.cos(self.rotation) - (self.width / 2.0) * math.sin(self.rotation))
		bx = ax + self.width * math.cos(self.rotation)
		dx = ax + self.height * math.sin(self.rotation)
		by = ay + self.width * math.sin(self.rotation)
		dy = ay - self.height * math.cos(self.rotation)

		bax = bx - ax
		bay = by - ay
		dax = dx - ax
		day = dy - ay

		if ((x - ax) * bax + (y - ay) * bay < 0.0):
			return False
		if ((x - bx) * bax + (y - by) * bay > 0.0):
			return False
		if ((x - ax) * dax + (y - ay) * day < 0.0):
			return False
		if ((x - dx) * dax + (y - dy) * day > 0.0):
			return False

		return True

	def add_piece(self, piece):
		self.pieces.add(piece)
		piece.zones.add(self)

	def remove_piece(self, piece):
		self.pieces.remove(piece)
		piece.zones.remove(self)

