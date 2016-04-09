import unittest
import random
import subprocess
import os
import time

from selenium import webdriver
from selenium.webdriver.common.keys import Keys as keys
from selenium.webdriver.common.by import By as by
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver import ActionChains
from selenium.webdriver.support.color import Color
from selenium.common.exceptions import TimeoutException

class InterfaceTest(unittest.TestCase):

	#class variables
	process = None
	driver = None
	wait = None

	#subclasses
	class javascript_to_be():
		def __init__(self, script, result=True):
			self.script = script
			self.result = result

		def __call__(self, driver):
			return InterfaceTest.driver.execute_script(self.script) == self.result

	def setUp(self):
		print "SET UP"
		InterfaceTest.driver = webdriver.Chrome()
		InterfaceTest.wait = WebDriverWait(InterfaceTest.driver, 5)
		InterfaceTest.driver.implicitly_wait(2)
		InterfaceTest.driver.get("http://localhost:8000")

		if InterfaceTest.driver:
			print "LOOKS OK"
		else:
			print "DRIVER IS NONE"

	def tearDown(self):
		InterfaceTest.driver.close()

	@classmethod
	def setUpClass(cls):
		InterfaceTest.process = subprocess.Popen(["java", "-Dwebdriver.chrome.driver=res/chromedriver.exe", "-jar", "selenium-server-standalone-2.48.2.jar"]);

	@classmethod
	def tearDownClass(cls):
		if InterfaceTest.process:
			InterfaceTest.process.kill()

	def modal_appear_wait(self, title):
		element = InterfaceTest.wait.until(ec.visibility_of_element_located((by.ID, "modal-template-title")))
		self.assertIn(title, element.text)

	def modal_complete(self):
		element = InterfaceTest.driver.find_element_by_id("submit-btn-modal-template")
		element.click()
		InterfaceTest.wait.until(ec.invisibility_of_element_located((by.ID, "template-modal")))

	def move_to_canvas_position(self, x, y, canvas=None):
		driver = InterfaceTest.driver

		if canvas is None:
			canvas = driver.find_element_by_id("canvas")
		canvas_size = canvas.size
		info = InterfaceTest.driver.execute_script("return [VBoard.size, VBoard.camera.upVector, VBoard.camera.position];")

		#convert game space to screen space
		x_pos = ((canvas_size["width"] * x) / (2.0 * info[0])) + canvas_size["width"]/2.0
		y_pos = ((canvas_size["height"] * -y) / (2.0 * info[0])) + canvas_size["height"]/2.0
		print("moving mouse to [" + str(x_pos) + ", " + str(y_pos) + "]")

		#TODO: use camera upVector and position
		ActionChains(InterfaceTest.driver).move_to_element_with_offset(canvas, x_pos, y_pos).perform()
		#InterfaceTest.wait.until(ec.invisibility_of_element_located((by.ID, "menu")))

	#coordinates are in game space
	def drag_from_to(self, startx, starty, endx, endy, canvas=None):
		driver = InterfaceTest.driver

		if canvas is None:
			canvas = driver.find_element_by_id("canvas")
		canvas_size = canvas.size
		self.move_to_canvas_position(startx, starty)
		#InterfaceTest.wait.until(ec.invisibility_of_element_located((by.ID, "menu")))
		ActionChains(InterfaceTest.driver).click_and_hold().perform()
		self.move_to_canvas_position(endx, endy)
		#InterfaceTest.wait.until(ec.invisibility_of_element_located((by.ID, "menu")))
		ActionChains(InterfaceTest.driver).release().perform()
		#InterfaceTest.wait.until(ec.invisibility_of_element_located((by.ID, "menu")))


	def create_lobby(self, name="frederick", color=None):
		driver = InterfaceTest.driver
		self.modal_appear_wait("name")

		name_entry = driver.find_element_by_id("user-nickname")
		name_entry.send_keys(name)
		color_master = driver.find_element_by_id("color-picker")
		color_blocks = color_master.find_elements_by_class_name("ColorBlotch")

		if color is None:
			color_block = random.choice(color_blocks)
			color_block.click()
		else:
			desired_color = Color.from_string(color)
			found = False

			for color_block in color_blocks:
				if Color.from_string(color_block.value_of_css_property("background-color")) == desired_color:
					color_block.click()
					found = True
					break
			if not found:
				raise Exception("unable to find desired color: " + color)
		self.modal_complete()

		username_button = driver.find_element_by_id("change-username")
		self.assertIn(name, username_button.text)

		create_button = driver.find_element_by_id("create-lobby")
		create_button.click()
		self.modal_appear_wait("Lobby")
		self.modal_complete()

		return InterfaceTest.wait.until(ec.visibility_of_element_located((by.ID, "canvas")))

	def spawn_chessboard(self, canvas=None):
		driver = InterfaceTest.driver
		wait = InterfaceTest.wait

		if canvas is None:
			canvas = driver.find_element_by_id("canvas")
		side_hover = driver.find_element_by_id("viewMenuHover")
		ActionChains(InterfaceTest.driver).move_to_element(side_hover).perform()
		chess_button = wait.until(ec.element_to_be_clickable((by.XPATH, "//*[contains(text(), 'Add ChessBoard')]")))
		chess_button.click()
		wait.until(InterfaceTest.javascript_to_be("return VBoard.board.pieces.length;", 33))

	def test_create_basic(self):
		driver = InterfaceTest.driver
		self.assertIn("VirtualBoard", driver.title)
		canvas = self.create_lobby();
		self.spawn_chessboard(canvas)

		return canvas

	def test_remove_piece(self):
		driver = InterfaceTest.driver
		wait = InterfaceTest.wait
		canvas = self.test_create_basic()

		self.move_to_canvas_position(-3, 5, canvas)
		ActionChains(InterfaceTest.driver).context_click().perform()
		context_menu = wait.until(ec.visibility_of_element_located((by.ID, "context-menu")))
		self.assertTrue(context_menu.is_displayed())

		delete_button = context_menu.find_element_by_id("context-delete")
		self.assertTrue(delete_button.is_displayed())
		delete_button.click()
		wait.until(InterfaceTest.javascript_to_be("return VBoard.board.pieces.length;", 32))
		return canvas


	def test_selection(self):
		driver = InterfaceTest.driver
		wait = InterfaceTest.wait
		canvas = self.test_create_basic()
		self.move_to_canvas_position(0, 0, canvas)

		#drag large box around most of top row
		self.move_to_canvas_position(-6, 9, canvas)
		self.drag_from_to(-6, 9, 6, 4, canvas)
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 12))

		#hold shift and draw a small box around bottom left 4 pieces
		ActionChains(InterfaceTest.driver).key_down(keys.LEFT_SHIFT).perform()
		self.drag_from_to(-7.1, -3, -4, -9, canvas)
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 16))

		#shift click on element in bottom right corner a few times
		self.move_to_canvas_position(7, -7, canvas)
		ActionChains(InterfaceTest.driver).click().perform()
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 17))
		ActionChains(InterfaceTest.driver).click().perform()
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 16))
		ActionChains(InterfaceTest.driver).click().perform()
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 17))
		ActionChains(InterfaceTest.driver).key_up(keys.LEFT_SHIFT).perform()

		#drag one of the selected elements
		self.drag_from_to(-1, 7, -1, 5, canvas)
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 17))

		#verify a piece moved, method 1
		wait.until(InterfaceTest.javascript_to_be("return Math.abs(VBoard.board.getFromID(8).position.y + 9.0) < 0.01;", True))

		#verify a piece moved, method 2
		self.move_to_canvas_position(-5, 3, canvas)
		wait.until(InterfaceTest.javascript_to_be("return VBoard.inputs.getPieceUnderMouse().id;", 19))

		#drag a non selected element
		self.drag_from_to(-1, -5, -1, -1, canvas)
		wait.until(InterfaceTest.javascript_to_be("return VBoard.selection.pieces.length;", 1))
		wait.until(InterfaceTest.javascript_to_be("return Math.abs(VBoard.board.getFromID(24).position.y + 1.0) < 0.01;", True))

		#spin 45 degrees and test drag box later maybe
		driver.execute_script("VBoard.inputs.onKeyDown(69);")
		wait.until(InterfaceTest.javascript_to_be("return -Math.atan2(VBoard.camera.upVector.x, VBoard.camera.upVector.y) > Math.PI/4;", True))
		driver.execute_script("VBoard.inputs.onKeyUp(69);")

	def test_chat(self):
		driver = InterfaceTest.driver
		wait = InterfaceTest.wait
		canvas = self.create_lobby()
		inbox = driver.find_element_by_id("chatbox-inbox")
		self.assertFalse(inbox.is_displayed())
		chat = driver.find_element_by_id("chatbox-msg")
		chat.click()
		wait.until(ec.visibility_of(inbox))
		chat.send_keys("<script>alert(1);</script>" + keys.RETURN)
		wait.until(ec.text_to_be_present_in_element((by.ID, "chatbox-inbox"), "<script>alert(1);</script>"))

		alert = False
		try:
			WebDriverWait(driver, 1).until(ec.alert_is_present())
			alert = True
		except TimeoutException:
			pass
		if alert:
			raise Exception("alert was generated")
		chat.send_keys("akuenwefuwabfawuefwef" + keys.RETURN)
		wait.until(ec.text_to_be_present_in_element((by.ID, "chatbox-inbox"), "akuenwefuwabfawuefwef"))
		#chat.send_keys(keys.ESCAPE)
		canvas.click()
		wait.until(ec.invisibility_of_element_located((by.ID, "chatbox-inbox")))

if __name__ == '__main__':
        unittest.main()

