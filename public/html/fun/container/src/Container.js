"use strict";


function Container( _key )
{
    this.key = _key || null;
    this.parent = null;
    this.children = null;
    this.lastUpdateTick = -1;

    this._addToDictionary(this.key);
}


Container.list = null;
Container.queue = [];
Container.explored = {};
Container.dictionary = {};


Container.prototype.create = function( _key, _parent )
{
    this.key = _key;
    this.parent = _parent;
    this.children = {};
    this.lastUpdateTick = -1;

    if (this.parent)
    {
        this.parent.addChild(this);
    }
}


Container.prototype.destroy = function()
{
    this.parent = null;
    this.children = null;
    this.key = null;
}


Container.prototype.update = function( _callback )
{
    // only update each Container once per frame (permits multiple references in the heirarchy)
    if (this.lastUpdateTick == Main.tick)
        return true;
    this.lastUpdateTick = Main.tick;    

    // do container update things...
    if (_callback)
    {
        _callback.bind(this)();
    }
    //console.log("updating Container." + this.key);

    // add all my children to the end of the FIFO queue so they will eventually get updated
    this._queueChildren();

    // breadth first search of all children
    while(Container.queue.length > 0)
    {
        var child = Container.queue.shift();
        child.update(_callback);
    }
}


Container.prototype.expandLinks = function( _maxDistance )
{
    Container.explored = {};
    Container.explored[this.key] = this;
    this._expandLinks( _maxDistance - 1 );
    return Container.explored;
}


/// NOTE: depth-first expansion
/// is this faster than breadth-first?  Will we need the Container.explored results to be in distance order?
Container.prototype._expandLinks = function( _distance )
{
    //console.log("expand " + this.key);
    if (_distance > 0)
    {
        if (this.links)
        {
            for(var i = 0, l = this.links.length; i < l; i++)
            {
                var roomName = this.links[i];
                if (!Container.explored[roomName])
                {
                    var room = Container.find(roomName);
                    if (room)
                    {
                        Container.explored[roomName] = room;
                        room._expandLinks( _distance - 1 );
                    }
                }
            }
        }
    }
}


Container.prototype.addChild = function( _child )
{
    if (this.children[_child.key])
    {
        console.warn("Container.addChild: duplicate key for child '" + _child.key + "'!");
    }
    else
    {
        this.children[_child.key] = _child;
        _child.parent = this;
    }
}


/// recurse through a tree which starts with "root", convert each node into a Container instance
Container.prototype.containerise = function( _name, _data, _parent, _onAdded )
{
    if (this.key == null)
    {
        this.key = "root" + _name;
        this._addToDictionary(this.key);
        console.log("containerise: " + this.key);
    }
    if (!_data || !_data[this.key])
    {
        console.warn("Container.containerise: there is no 'root' in the Container data!");
        return;
    }
    this.parent = _parent;
    this.children = {};
    this._createFromData(_data[this.key], _onAdded);
}


Container.prototype._createFromData = function( _data, _onAdded )
{
    if (_data)
    {
        for(var prop in _data)
        {
            // TODO: deep copy required if any complex structures are added to WorldData or PopulationData unless a reference is sufficient
            this[prop] = _data[prop];
            if (prop == "children")
            {
                for(var key in this.children)
                {
                    //console.log(key);
                    var container = new Container(key);
                    container._createFromData(this.children[key], _onAdded);
                    this.children[key] = container;
                    container.parent = this;
                }
            }
        }

        if (_onAdded)
        {
            _onAdded(this);
        }
    }
}


Container.prototype._addToDictionary = function( _key )
{
    if (_key)
    {
        if (Container.dictionary[_key])
        {
            Container.dictionary[_key].push(this);
            console.warn("Container.dictionary: duplicate entries (" + _key + ")! x" + Container.dictionary[_key].length);
        }
        else
        {
            Container.dictionary[_key] = [ this ];
        }
    }
}


Container.prototype._queueChildren = function()
{
    for(var key in this.children)
    {
        var child = this.children[key];
        Container.queue.push(child);
    }
    return Container.queue.length;
}


/// search the dictionary for the first matching _key
Container.find = function( _key )
{
    //console.log("find " + _key);

    var matches = Container.dictionary[_key];
    if (matches && matches.length > 0)
    {
        if (matches.length > 1)
            console.warn("Container.find: multiple entries match '" + _key + "'!");
        return matches[0];
    }

    console.log("container " + _key + " not found");
    return null;
}


// merge properties for all _list items with a key that matches a _data item
// e.g. World.create and Population.create
Container.mergeProperties = function( _list, _data )
{
    for(var i = 0, l = _list.length; i < l; i++)
    {
        var item = _list[i];
        if (item && item.properties && item.key)
        {
            var data = _data[item.key];
            if (data)
            {
                for(var p in data)
                {
                    item.properties[p] = data[p];
                }
            }
        }
    }
};




    // calling example:
    // NOTE: returns a list of all matching _key entries...
    // TODO if enabled: parent search for _start? how to resolve multiples? enforce unique keys?
    // return _start.find( _key );
    //
    // /// depth-first search of all of my children, for _key
    // Container.prototype.findKey = function( _key )
    // {
    //     // if (this.children[_key])
    //     //     return this.children[_key][0];

    //     // TODO if enabled: this means _every_ key must be unique: check it on container creation? that will become expensive!
    //     // Create and maintain a object to represent a dictionary of key/container references...
    //     // can then replace this with simply: return this.dictionary[key];
    //     // Might want to also add a processing order parameter to all containers, which would replace the breadth first
    //     // update loop with a more flexible system and a single fast loop
    //     // for(var key in this.children)
    //     // {
    //     //     return this.children[key].findKey( _key );
    //     // }

    //     var l = Container.dictionary[_key];
    //     if (l && l.length > 0)
    //     {
    //         if (l.length > 1) console.warn("Container.findKey: multiple entries match '" + _key + "'!");
    //         return Container.dictionary[_key][0];
    //     }

    //     console.warn("Container.findKey: key '" + _key + "' not found!");
    //     return null;
    // }



    // e.g. var rooms = Container.findAll(this, "properties", "type", ContainerType.room);
    // Container.findAll = function( _parent, _property, _key, _value )
    // {
    //     var list = [];
    //     // TODO if enabled: this searches the entire dictionary, very simple so fast... but potentially huge
    //     // at some dictionary size (and _parent depth) it will be faster to start at _parent and recurse the tree
    //     for(var key in Container.dictionary)
    //     {
    //         var matches = Container.dictionary[key];
    //         var l = matches.length;
    //         for(var i = 0; i < l; i++)
    //         {
    //             var item = matches[i];
    //             if (item[_property] && item[_property][_key] == _value)
    //             {
    //                 list.push(item);
    //             }
    //         }
    //     }
    //     return list;
    // }


// create and return a list starting from this Container
// breadth-first order, validate entries if _valid function is provided
// stop at _maxDepth levels down, or end nodes of tree
// Container.prototype.sub = function( _maxDepth, _valid )
// {
//     Container.list = [];
//     if (_maxDepth == 0) return Container.list;
//
//     Container.queue = [ this ];
//     var l;
//     while((l = Container.queue.length) > 0)
//     {
//         while(l--)
//         {
//             var next = Container.queue.shift();
//             if (!_valid || _valid(next))
//                 Container.list.push(next);
//             next._queueChildren();
//         }
//         if (--_maxDepth <= 0) break;
//     }
//     return Container.list;
// }


// create and return a list starting from this Container
// breadth-first order
// each entry is a list of Containers at that level
// stop at _maxDepth levels down, or end nodes of tree
/*  // e.g.
    var levels = _container.subLevels(_maxDepth);
    var l = levels.length;
    // for every level beneath _container
    for(var i = 1; i < l; i++)
    {
        // for every room in that level
        for(var j = 0, k = levels[i]; j < k; j++)
        {
            
        }
    }
*/
// Container.prototype.subLevels = function( _maxDepth )
// {
//     Container.list = [];
//     if (_maxDepth == 0) return Container.list;

//     Container.queue = [ this ];
//     var level = 0;
//     var l;
//     while((l = Container.queue.length) > 0)
//     {
//         // collect all the Containers at this level
//         Container.list[level] = [];
//         while(l--)
//         {
//             var next = Container.queue.shift();
//             Container.list[level].push(next);
//             next._queueChildren();
//         }

//         level++;
//         if (level >= _maxDepth) break;
//     }
//     return Container.list;
// }
