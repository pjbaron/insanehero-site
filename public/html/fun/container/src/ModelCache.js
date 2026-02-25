"use strict";


//
// avoid rebuilding models by caching them
// uses a JS object (associative array) to store all model names for fast look-up and retrieval
// additionally, doubly-linked-list connections are added for ordering, traversal and relocation
// when an entry is accessed, it is moved to the top of the linked list
// when the buffer is full, the bottom N linked elements are removed and their models are disposed
//


RR.ModelCache = function()
{
    this.firstRoomAdded = null;
    this.lastRoomAdded = null;
    this.roomCount = 0;
    this.modelCache = null;
}


// NOTE: the remaining rooms must be greater than the largest possible single tick
// expansion, otherwise we risk deleting the room that the player is currently in!
RR.ModelCache.MaxRoomsInBuffer = 512;       // arbitrary starting value, adjust as required
RR.ModelCache.DecreaseBufferAmount = 64;    // how many rooms to remove in a batch when the buffer is full


RR.ModelCache.prototype.create = function()
{
    this.firstRoomAdded = null;
    this.lastRoomAdded = null;
    this.roomCount = 0;
    this.modelCache = {};
}


RR.ModelCache.prototype.destroy = function()
{
    this.modelCache = null;
    this.roomCount = 0;
    this.firstRoomAdded = null;
    this.lastRoomAdded = null;
}


// is this model in the buffer?
// return: the model, or null
RR.ModelCache.prototype.checkBuffer = function( _name )
{
    var roomData = this.modelCache[_name];
    if (roomData)
    {
        // update the time-stamp when we revisit a cached room
        roomData.added = Main.tick;

        // if this is not the last room in the list already
        if (_name != this.lastRoomAdded)
        {
            // close up the hole that moving this room will make in the linked list
            var prev = roomData.prev;
            var next = roomData.next;
            if (prev) this.modelCache[prev].next = next;
            if (next) this.modelCache[next].prev = prev;
            if (_name == this.firstRoomAdded) this.firstRoomAdded = next;

            // move this room to the end of the list
            roomData.prev = this.lastRoomAdded;
            this.modelCache[this.lastRoomAdded].next = _name;
            this.lastRoomAdded = _name;
            roomData.next = null;
        }

        return roomData.room;
    }
    return null;
}


// add this model to the buffer
// if the buffer is full, remove a number of the oldest elements
RR.ModelCache.prototype.addToBuffer = function( _name, _model )
{
    if (this.modelCache[_name])
    {
        return;
    }

    if (this.roomCount >= RR.ModelCache.MaxRoomsInBuffer)
    {
        this.emptyBuffer(RR.ModelCache.DecreaseBufferAmount);
    }

    // add this room to the buffer
    var roomData = this.modelCache[_name] = { added: Main.tick, room: _model, prev: null, next: null };

    // first room in the buffer, remember it (start of the linked list)
    if (!this.firstRoomAdded)
    {
        this.firstRoomAdded = _name;
    }

    // the buffer is not empty
    if (this.lastRoomAdded)
    {
        // set his 'next' link to me
        this.modelCache[this.lastRoomAdded].next = _name;
        // set my 'prev' link to him
        roomData.prev = this.lastRoomAdded;
    }

    // this room is now the last room added
    this.lastRoomAdded = _name;

    // always track the buffer size
    this.roomCount++;
}


RR.ModelCache.prototype.emptyBuffer = function( _number )
{
    for(var i = 0; i < _number ; i++)
    {
        // select the oldest room in the buffer
        var oldestRoom = this.modelCache[this.firstRoomAdded];
        // remember what it was linked to
        var next = oldestRoom.next;

        // deprecated early error catching - should not be needed unless the linked list code gets broken
        // if (!next) console.alert("error");
        // if (!this.modelCache[next]) console.alert("error");
        // if (next == this.firstRoomAdded) console.alert("error");

        // dispose the babylon mesh for the oldest room
        oldestRoom.room.dispose();
        // delete the oldest room in the buffer
        delete this.modelCache[this.firstRoomAdded];
        //oldestRoom = null;
        // remember the name of the room which is now the oldest room in the buffer
        this.firstRoomAdded = next;
        // that room no longer has a previous room, it is the start of the doubly linked list
        this.modelCache[next].prev = null;
        // always track the buffer size
        this.roomCount--;
    }
}
