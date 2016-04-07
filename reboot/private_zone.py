import math

class PrivateZone:
    
    def __init__(self, x, y, width, height, rotation, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.rotation = rotation
        self.color = color

    def get_json_obj(self):
        return {
            "pos" : {
                "x" : self.x,
                "y" : self.y
            },
            "width" : self.width,
            "height" : self.height,
            "rotation" : self.rotation,
            "color" : self.color
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