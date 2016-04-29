class MoveBufferNode:
	#this class is just so I can use dot notation to access fields
	def __init__(self, id, pos, user, tail, client_set):
		self.prev = tail
		self.next = None
		self.pending_clients = client_set
		self.pos = pos
		self.id = id
		self.user = user

class MoveBuffer:
	#python version of the VBoard.sessionIO.moveBuffer system
	#doubly linked list with hash access

	def __init__(self):
		self.head = None
		self.tail = None

		#unfortunately, only one timeout instead of handling separate timings for each client
		#maybe this gets finished in a future iteration
		self.flush_timeout = None

		#maps piece ids to pending packets
		self.list_map = {}

		#maps clients to pending packets
		self.client_map = {}

		#since there is no "tail packet" this will have to do
		self.synchronized_clients = set()

	def add(self, id, pos, user):
		self.remove(id)
		self.list_map[id] = MoveBufferNode(id, pos, user, self.tail, self.synchronized_clients)

		for user_id in self.synchronized_clients:
			self.client_map[user_id] = self.list_map[id]

		#we have no synchronized clients now, big surprise
		self.synchronized_clients = set()

		if self.tail is not None:
			self.tail.next = self.list_map[id]
		elif self.head is None:
			self.head = self.list_map[id]
		self.tail = self.list_map[id]

	def remove(self, id):
		if id in self.list_map:
			prev = self.list_map[id].prev
			next = self.list_map[id].next
			client_set = self.list_map[id].pending_clients

			#merge clients waiting on this packet into next one, if it exists
			if next is None:
				next_client_set = self.synchronized_clients
			else:
				next_client_set = next.pending_clients

			for user_id in client_set:
				self.client_map[user_id] = next
			next_client_set |= client_set

			#housekeeping
			if prev is None:
				self.head = next
			else:
				prev.next = next

			if next is None:
				self.tail = prev
			else:
				next.prev = prev
			del self.list_map[id]

	def add_client(self, user_id):
		self.client_map[user_id] = None
		self.synchronized_clients.add(user_id)

	def remove_client(self, user_id):
		self.flush(user_id)
		self.synchronized_clients.remove(user_id)
		del self.client_map[user_id]

	def has_entries(self, user_id=None):
		if user_id is None:
			#do we have any packets pending for anyone?
			if self.head is None:
				return False
			return True

		#do we have packets pending for user_id
		if self.client_map[user_id] is None:
			return False
		return True

	def flush(self, user_id):
		#piece = self.head
		piece = self.client_map[user_id]
		data = []

		if piece is not None:
			piece.pending_clients.remove(user_id)

		while piece is not None:
			data.append({
				"p" : piece.id,
				"u" : piece.user,
				"pos" : piece.pos
			})
			next_piece = piece.next

			if piece.prev is None and len(piece.pending_clients) == 0:
				self.remove(piece.id)
			piece = next_piece
		self.synchronized_clients.add(user_id)
		self.client_map[user_id] = None
		return data

