Sortable = {
    /**
     * Create a table that can that support sorting based on a selected header
     * of the table column and pagination.Provide also an API to access, edit
     * and filter the data presented by the table.
     * 
     * 
     * @param data :
     *            an array of the data to be presented by the table.
     * 
     * @param metadata :
     *            metadata an array of JavasScript objects defining the metadata
     *            (structure) of the table. The structure of the metadata is as
     *            follow : [ {metadataObject1, ..., metadataObjectn}] where each
     *            metadataObject is defined as follow:
     *            <p> { columnName : field, columnValueType : type,
     *            columnHeaderLabel : label, columnWidth : width }
     *            </p>
     *            <ul>
     *              <li>columnName : Name of the column. Correspond to the name
     *                  of of a property existing in the objects presented by the
     *                  table. By doing so the value of that property will be shown
     *                  in the column.
     *              </li>
     *              <li>columnValueType : type of the value shown by the column.
     *                  Correspond also to the type of the property associated with
     *                  the column.
     *              </li>
     *              <li>columnHeaderLabel : The text appearing as on the table
     *                  header as the label of the column
     *              </li>
     *              <li>columnWidth : Width of the column, can be specified
     *                  either in pixels or percentage.
     *              </li>
     *            <ul>
     * @param target
     *            the id of the html table to be use
     * @param style
     *            name of the css style associated to the table.
     * @param selectable
     *            flag indicating whether the table to be created should support
     *            row selection or not.
     * @param sortable
     *            flag indicating whether the table should support sorting or
     *            not.
     * @param paginate
     *            flag indicating whether the table should support pagination or
     *            not.
     * 
     */
    create : function(data, metadata, target, style, selectable, sortable,
                      paginate) {

        // --------------------------------------------------------------------
        //
        // 'Public' Constants.
        //
        // --------------------------------------------------------------------
        var UNDEFINED_INDEX = -1;
        var ASCENDING_ORDER = 1;
        var DESCENDING_ORDER = -1;
        var DEFAULT_PAGE_SIZE = 10;
        var LEFT_SHIT = -1;
        var RIGHT_SHIFT = 1;

        // --------------------------------------------------------------------
        //
        // Table setting variables.
        //
        // --------------------------------------------------------------------
        var _data = data || [];
        var _metadata = metadata || {};
        var _target = target || '';
        var _style = style || '';
        var _selectable = selectable || true;
        var _sortable = sortable || true;
        var _paginate = paginate || false;

        // --------------------------------------------------------------------
        //
        // Pagination and sorting variables
        //
        // --------------------------------------------------------------------
        var _pageSizes = [ 5, 10, 25, 50, 100, 250, 500, 1000, 5000 ];
        
        // Si data.length >  default page size -> page size = default
        // Si data.length < page size ?
        var _pageSize = DEFAULT_PAGE_SIZE;
        var _currentPage = 1;
        var _totalPages = Math.ceil(_data.length / _pageSize);

        // Start and end are indexes that mark where the current page shown
        // starts and where to end in the data array.
        var _start = 0;
        var _end = _start + _pageSize;

        // ppaginationStart and paginationEnd are to mark where the numbering
        // of the page start and end.
        var _paginationStart = 1;
        var _paginationEnd = _totalPages;

        // How many pages are shown on the page.
        var _paginationViewSize = 10;

        // Sort variable
        var _sortField = null;
        var _sortOrder = 1;

        // --------------------------------------------------------------------
        //
        // UI identification variables i.e used as id of html elements.
        //
        // --------------------------------------------------------------------
        var _paginationTable = 'paginationTable';
        var _first = 'first';
        var _previous = 'previous';
        var _next = 'next';
        var _last = 'last';
        var _pageClass = 'page';
        var _pageSizeSelection = 'pageSize';
        var _table = '#' + target;
        var _thead = _table + ' thead';
        var _tbody = _table + ' tbody';
        var _rows = _tbody + ' tr';

        // --------------------------------------------------------------------
        //
        // Filtering variables
        //
        // --------------------------------------------------------------------

        // Filters are pairs of field : value, used to select data to be shown
        // in the table. Fields must be valid fields defined in the table's
        // metadata. Filters are grouped in an object under the following format
        // { field1 : field1Value, ..., fieldn : fieldnValue }
        var _filters = null;

        // Array of indexed of elements whose fields match the values specified
        // by the filters.
        var _filtered = [];

        // Row selection variables
        var _currentSelecteRowIndex = UNDEFINED_INDEX;
        var _currentSelectedRowPage = UNDEFINED_INDEX;

        // Which column is currently used to sort the data
        var _columnSortIndex = UNDEFINED_INDEX;

        // --------------------------------------------------------------------
        //
        // Helper functions (will be moved under utilis)
        //
        // --------------------------------------------------------------------

        /**
         * Get all keys (properties's names) of an object excluding the keys
         * inherited.
         * 
         * @param object
         *            the object from which to get the keys.
         */
        function getObjectKeys(object) {
            var keys = [];
            if (object) {
                for ( var key in object) {
                    if (object.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }
            }
            return keys;
        };

        /**
         * Get the index of a filtered element in the data array.
         * 
         * @param index
         *            the index of the element in the filtered array.
         * 
         */
        function getUnfilteredIndex(index) {
            if (validateIndex(index)) {
                var filteredSize = _filtered.length;
                if (filteredSize > 0 && index < filteredSize) {
                    return _filtered[index];
                }
            }
            return index;
        };

        /**
         * Check the boundaries of an array index.
         * 
         * @param index
         *            the index to check.
         */
        function validateIndex(index) {
            if (typeof index === 'number') {
                return _filters ? index > UNDEFINED_INDEX
                        && index < _filtered.length : index > UNDEFINED_INDEX
                        && index < _data.length;
            }
            return false;
        };
        
        /**
         * Check the real index of an element based on the position of the row
         * displaying the data element in the table.
         * 
         * @param position
         *            the index to check.
         * @return the index of the element in the data array.
         */
        function getArrayIndex(position){
             return ((_currentPage - 1) * _pageSize) + position;
        };

        /**
         * Compare the values of the filtered array.
         * 
         * @param field
         *            the field on which the elements are to be compared.
         * @param type
         *            the type of the value hold by the comparison field.
         * @param order
         *            the order of comparison i.e the greater element first or
         *            the inverse.
         */
        function compareFilteredValue(field, type, order) {
            return function(first, second) {
                var firstValue = _data[first][field];
                var secondValue = _data[second][field];
                switch (type) {
                    case 'number':
                    case 'double':
                    case 'float':
                        return (firstValue - secondValue) * order;
    
                    case 'date':
                        var t1 = new Date(firstValue).getTime();
                        var t2 = new Date(secondValue).getTime();
                        var comparison = (t1 < t2) ? -1 : (t1 > t2) ? 1: 0;
                        return comparison * order;
    
                    case 'string':
                    default:
                        var comparison = (firstValue < secondValue) ? 
                                        -1 : (firstValue > secondValue) ? 1 : 0;
                        return comparison * order;
                }
            }
        };

        /**
         * Compare the values of the data array.
         * 
         * @param field
         *            the field on which the elements are to be compared.
         * @param type
         *            the type of the value hold by the comparison field.
         * @param order
         *            the order of comparison i.e the greater element first or
         *            the inverse.
         */
        function compareValue(field, type, order) {
            
            return function(firstItem, secondItem) {
                var firstValue = firstItem[field];
                var secondValue = secondItem[field];
                switch (type) {
                    case 'number':
                    case 'double':
                    case 'float':
                        return (firstValue - secondValue) * order;
    
                    case 'date':
                        var t1 = new Date(firstValue).getTime();
                        var t2 = new Date(secondValue).getTime();
                        var comparison = (t1 < t2) ? -1 : (t1 > t2) ? 1 : 0;
                        return comparison * order;
    
                    case 'string':
                    default:
                        var comparison = (firstValue < secondValue) ? -1
                                : (firstValue > secondValue) ? 1 : 0;
                        return comparison * order;
                }
            }
        };

        // --------------------------------------------------------------------
        //
        // Pagination functions
        //
        // --------------------------------------------------------------------

        /**
         * Show a specific table page.
         * 
         * @param page
         *            the number of the page to show.
         */
        function goToPage(page) {
            if (page !== undefined) {
                _currentPage = page;
                _end = page * _pageSize;
                _start = _end - _pageSize;

                // Check if we're not out of bounds, whether there is filtering
                // or not.
                if (_filtered.length > 0 && _end > _filtered.length) {
                    _end = _filtered.length;
                } else if (_end > _data.length) {
                    _end = _data.length;
                }
                refreshTableBody();
            }
        };

        /**
         * Set the size of a page.
         * 
         * @param size
         *            the new size to set.
         */
        function setPageSize(size) {
            if (size !== undefined) {
                _pageSize = size;
                // restart over
                _currentPage = UNDEFINED_INDEX;

                // later need to find where this index will be if the page
                // change
                // for now we just unset it.
                _currentSelecteRowIndex = UNDEFINED_INDEX;
                _currentSelectedRowPage = UNDEFINED_INDEX;

                // Here we need to consider if the data is not
                updatePagination();
                _paginationStart = 1;
                goToPage(1);
            }
        };

        /**
         * Update the number of page and the limit of the pagination.
         */
        function updatePagination(){
            var itemCount = (_filtered.length > 0) ? _filtered.length : _data.length;
            _totalPages = ( _pageSize > itemCount ) ? 1 : Math.ceil(itemCount / _pageSize);
            _paginationEnd = _totalPages;
        };

        /**
         * Shift the pagination number either to the left or the right, in order
         * to show the numbers of the pages that where hidden.
         * 
         * @param size
         *            size of the pagination window i.e the number of page
         *            numbers shown.
         * @param direction
         *            the direction in which to shift the numbers.
         */
        function shiftPagination(size, direction) {
            if (size) {
                var pageShift = (size * direction);
                _paginationEnd += pageShift;
                _paginationStart += pageShift;
                if (_paginationStart < 1) {
                    _paginationStart = 1;
                    _paginationEnd = _paginationViewSize;
                } else if (_paginationEnd > _totalPages) {
                    _paginationEnd = _totalPages;
                    _paginationStart = _paginationEnd - _paginationViewSize;
                }
                refreshPaginationView();
            }
        };

        /**
         * Refresh and update the pagination menu.
         */
        function refreshPaginationView() {
            var table = '<table id=\'' + _paginationTable + '\'>';
            table += '<tr>';
            table += '<td>';

            // Need to set the selected item i.e the one == page size
            table += '<select id=\'' + _pageSizeSelection + '\'>';
            for ( var i = 0; i < _pageSizes.length; i++) {
                var size = _pageSizes[i];
                if (size < _data.length) {
                    table += '<option value=\'' + size + '\'';
                    if (size === _pageSize) {
                        table += ' selected=\'selected\'';
                    }
                    table += '>';
                    table += size;
                    table += '</option>';
                } else {
                    break;
                }
            }
            table += '<option value=\'' + _data.length + '\'';
            if (_pageSize >= _data.length) {
                table += ' selected=\'selected\'';
            }
            table += '>All</option>';
            table += '</select>';
            table += '</td>';

            // Show the first and previous button if we're not on the first
            // page.
            if (_currentPage !== 1) {
                table += '<td><span id=\'' + _first + '\'> first</span></td>';
                table += '<td><span id=\'' + _previous
                        + '\'>previous</span></td>';
            }

            // show the page between if there are more than 2 pages;
            for ( var i = _paginationStart; i <= _paginationEnd && _totalPages > 1; i++) {
                table += '<td>';
                table += '<span class=\'' + _pageClass + '\' id=\''
                        + ('page_' + i) + '\'>';
                if (i === _currentPage) {
                    table += '<b>' + i + '</b>';
                } else {
                    table += i;
                }
                table += '</span></td>';
            }

            // Show the last and next button if we're not on the last page.
            if (_currentPage !== _totalPages) {
                table += '<td><span id=\'' + _next + '\'> next</span></td>';
                table += '<td><span id=\'' + _last + '\'>last</span></td>';
            }
            table += '</tr></table>';

            $('#' + _paginationTable).remove();
            $(_table).after(table);

            // Now append navigation actions
            $('.' + _pageClass).click(function() {
                var page = parseInt($(this).attr('id').split('_').pop());
                if (page !== _currentPage) {
                    goToPage(page);
                }
            });

            $('#' + _first).click(function() {
                goToPage(1);
            });

            $('#' + _previous).click(function() {
                goToPage(_currentPage - 1);
            });

            $('#' + _next).click(function() {
                goToPage(_currentPage + 1);
            });

            $('#' + _last).click(function() {
                goToPage(_totalPages);
            });

            $('#' + _pageSizeSelection).change(function() {
                var newSize = parseInt($(this).val());
                setPageSize(newSize);
            });
        };

        // --------------------------------------------------------------------
        //
        // Filtering functions
        //
        // --------------------------------------------------------------------

        /**
         * Clear the filters and the array of indexes of filtered elements.
         */
        function resetFilters() {
            _filtered = [];
            _filters = null;
        };

        /**
         * Apply filtering to the data displayed by the table.
         * 
         * @param filters
         *            the filters to apply to the data.
         */
        function filter(filters) {

            // reset any previous filter indexes
            resetFilters();

            if (filters) {
                // get the keys
                var fields = [];
                for ( var i = 0; i < _metadata.length; i++) {
                    var entry = _metadata[i];
                    var searchKey = entry.field;

                    // if the metadata
                    if (filters.hasOwnProperty(searchKey)) {
                        fields[searchKey] = entry.type;
                    }
                }

                // if we do have valid filters i.e with searck keys defined
                // within the table metadata.
                if (!$.isEmptyObject(fields)) {

                    // remember the filters
                    _filters = filters;
                    // now for each item of the data, check if it has the
                    // values defined by the search keys in the filters.
                    _data.filter(function(element, index, array) {
                        var hasValue = false;
                        for ( var key in fields) {
                            if (fields.hasOwnProperty(key)) {
                                var type = fields[key];
                                var filterValue = filters[key];
                                var itemValue = element[key];
                                switch (type) {
                                case 'number':
                                case 'double':
                                case 'float':
                                    hasValue = ((parseFloat(filterValue) - parseFloat(itemValue)) == 0);
                                    break;

                                case 'date':
                                    var t1 = new Date(filterValue).getTime();
                                    var t2 = new Date(itemValue).getTime();
                                    hasValue = (t1 === t2);
                                    break;

                                case 'string':
                                    filterValue = filterValue.toLowerCase();
                                    itemValue = itemValue.toLowerCase();

                                    // first check if the entire sentence is contained as is
                                    if (itemValue.indexOf(filterValue) > UNDEFINED_INDEX) {
                                        hasValue = true;
                                    } else {
                                        filterValue = filterValue.split(' ');
                                        var size = filterValue.length;
                                        var count = 0;
                                        // All key search key words must be part
                                        // of the field regardless of their order.
                                        for ( var i = 0; i < size; i++) {
                                            var value = filterValue[i];
                                            if (itemValue.indexOf(value) > UNDEFINED_INDEX) {
                                                count++;
                                            }
                                        }
                                        hasValue = (count === size);
                                    }
                                    break;
                                }

                                // Only items that match all the filters's
                                // fields are accepted. If any previous filter
                                // value did not match he corresponding element
                                // value then there is no need to continue
                                // checking the remaining item fields.
                                if (!hasValue) {
                                    break;
                                }

                            }
                        }
                        if (hasValue) {
                            _filtered.push(index);
                        }
                    });
                }
            }
        };

        /**
         * Make a row selectable.
         * 
         * @param table
         *            id of table to which the row belongs to.
         * @param row
         *            the row to male selectable.
         * 
         */
        function selectableRow(table, row) {
            row.click(function() {
                var newSelectedRowIndex = $(this).index();

                if (newSelectedRowIndex !== undefined) {

                    // We clicked on a row already selected,
                    // unselect it
                    if (newSelectedRowIndex === _currentSelecteRowIndex) {
                        _currentSelecteRowIndex = UNDEFINED_INDEX;
                        _currentSelectedRowPage = UNDEFINED_INDEX;
                        $(this).removeClass(_style);
                    } else {
                        if (_currentSelecteRowIndex > UNDEFINED_INDEX) {
                            // unselect the previous selected row
                            var oldSelectedRow = $(_rows)[_currentSelecteRowIndex];
                            $(oldSelectedRow).removeClass(_style);
                        }
                        _currentSelecteRowIndex = newSelectedRowIndex;
                        _currentSelectedRowPage = _currentPage;
                        $(this).addClass(_style);
                    }
                }
            });
        };

        /**
         * Make selectable all rows of a table.
         * 
         * @param table
         *            the table with the rows to make selectable.
         */
        function selectableTable(table) {
            $(_rows).each(function(index) {
                var row = $(this);
                selectableRow(table, row);
            });
        };

        /**
         * Make a table sortable
         * 
         * @param table
         *            the table to make sortable.
         */
        function sortableTable(table) {
            var headers = table + ' th';
            $(headers).click(function() {
                var column = $(this).index();
                if (column !== undefined) {
                    var field = _metadata[column];
                    if (field.field === _sortField) {
                        _sortOrder = (_sortOrder * DESCENDING_ORDER);
                    } else {
                        // Update both the order orientation and the field.
                        _sortOrder = (ASCENDING_ORDER);
                        _sortField = field.field;
                    }
                    sortByField(field, _sortOrder);
                    if (_filters) {
                        setPageSize(_pageSize);
                    } else {
                        refreshTableBody();
                    }
                }
            });
        };

        /**
         * Sort the data base on specific metadata field.
         * 
         * @param metadataField
         *            the metadata field on which to base the sorting
         * @param order
         *            the order of the sorting.
         */
        function sortByField(metadataField, order) {
            if (metadataField) {

                // Get the type of the field used to sort objets
                var type = metadataField.type;
                var field = metadataField.field;

                if (_filters) {
                    _filtered.sort(compareFilteredValue(field, type, order));

                } else {
                    var selectedItem = null;
                    // save the current select before sorting.

                    if (_currentSelecteRowIndex !== UNDEFINED_INDEX) {
                        selectedItem = _data[_currentSelecteRowIndex];
                    }

                    _data.sort(compareValue(field, type, order));

                    // Find out where the element previousely selected is
                    // located and update the index
                    if (selectedItem) {
                        _currentSelecteRowIndex = _data.indexOf(selectedItem);
                    }
                }
            }
        };

        /**
         * Append a new row to the table
         * 
         * @param data
         *            the data of the row to append.
         */
        function appendRow(data) {
            var row = '<tr>';
            for ( var i = 0; i < _metadata.length; i++) {
                var key = _metadata[i].field;
                row += '<td>' + data[key] + '</td>';
            }
            row += '</tr>';
            $(_tbody).append(row);

            // Make the new row selectable if the table allows it.
            if (_selectable) {
                selectableRow(_table, $(_rows + ':last'));
            }
        };

        /**
         * Remove a row from the table
         * 
         * @param position
         *            the position of the row to remove.
         */
        function removeRowAt(position) {
            $(_rows).each(function(index) {
                var row = $(this);
                if (index === position) {
                    row.remove();
                }
            });
        };

        /**
         * Update a row
         * 
         * @param position
         *            the position of the rwo to update.
         * @param data
         *            the new data to update the row.
         */
        function updateRow(position, data) {
            var row = $(_rows)[position];
            var cells = $('td', row);
            for ( var field in data) {
                if (data.hasOwnProperty(field)) {
                    for ( var index = 0; index < _metadata.length; index++) {
                        if (_metadata[index].field === field) {
                            cells.eq(index).html(data[field]);
                            break;
                        }
                    }
                }
            }
        };

        /**
         * Redraw the headers of the table.
         */
        function refreshTableHeader() {
            // create the headers
            var headerRow = '<tr>';
            for ( var i = 0; i < _metadata.length; i++) {
                headerRow += '<th>' + _metadata[i].label;
                headerRow += '</th>';
            }

            headerRow += '</tr>';

            // remove any existing header row.
            $(_thead + ' tr').remove();

            // Add the new one
            $(_thead).append(headerRow);

            // Make sortable if requested at creation.
            if (_sortable) {
                sortableTable(_table);
            }
        };

        /**
         * Redraw the table body.
         */
        function refreshTableBody() {
            // remove the current rows
            $(_rows).remove();

            if (_filtered.length > 0) {
                for ( var i = _start; i < _end; i++) {
                    var index = getUnfilteredIndex(i);
                    appendRow(_data[index]);
                }
            } else {
                for ( var i = _start; i < _end; i++) {
                    appendRow(_data[i]);
                }
            }

            if (_currentSelectedRowPage === _currentPage && 
                _currentSelecteRowIndex !== UNDEFINED_INDEX) {
                var selectedRow = $(_rows)[_currentSelecteRowIndex];
                $(selectedRow).addClass(_style);
            }else{
                // For now whenver you change the page we unset the selected
                // item. Later we need to keep track of the current select
                // element regardless of the page or the sorting.
                // perhaps mark the selected element with a flag = true
                // and one iterating to display check if the element
                // si marked as selected. if so then update the index
                // with the current i of the row
                // with that there is no need to remember the page neither.
                _currentSelecteRowIndex =UNDEFINED_INDEX;
            }

            if (_paginate) {
                refreshPaginationView();
            }
        };
        
        return {

            UNDEFINED_INDEX : UNDEFINED_INDEX,
            ASCENDING_ORDER : ASCENDING_ORDER,
            DESCENDING_ORDER : DESCENDING_ORDER,
            DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE,

            /**
             * Add new data (new element) to the data array
             * 
             * @param data
             *            the data element to add.
             */
            appendData : function(data) {
                if (data) {
                    _data.push(data);
                    // Since adding a new item require an insertion in the
                    // db,
                    // a refresh of the table seem to be the best option
                    // so we'll clear the filter right after i.e if the
                    // insertion is succcessfull.
                    resetFilters();
                    updatePagination();
                    // force page redraw
                    goToPage(_currentPage);
                }
            },

            /**
             * Remove an element from the data array and update the pagination
             * if necessary.
             * 
             * @param index
             *            index of the element to remove.
             */
            removeData : function(index) {
                if (validateIndex(index)) {

                    // We need to consider the pagination since the index
                    // may be an ith index buth from an ith page.
                    var arrayIndex = getArrayIndex(index);
                    
                    var position = getUnfilteredIndex(arrayIndex);
                    // in case there is any filtering make sure we nee to
                    // remove
                    // the right item
                    _data.splice(position, 1);

                    // unset the current seleteRowIndex since the row
                    // representing the data removed may be the one
                    // selected.
                    if (position === _currentSelecteRowIndex) {
                        _currentSelecteRowIndex = UNDEFINED_INDEX;
                    }
                    updatePagination();

                    // force page redraw

                    // if this was the last element of the page go to the
                    // previous page otherwise go to the current page to
                    // force
                    // redraws
                    if (_currentPage > _totalPages) {
                        goToPage(_currentPage - 1);
                    } else {
                        goToPage(_currentPage);
                    }

                }
            },

            /**
             * Update an element of the data array.
             * 
             * @param index
             *            the index of the element to update.
             * @param data
             *            the date to update the element.
             */
            updateData : function(index, data) {
                if (validateIndex(index) && data) {

                    // We need to consider the pagination since the index
                    // may be an ith index buth from an ith page.
                    var arrayIndex = getArrayIndex(index);

                    // in case there is any filtering make sure we nee to
                    // update
                    // the right item
                    var position = getUnfilteredIndex(arrayIndex);

                    for ( var i = 0; i < _metadata.length; i++) {
                        var key = _metadata[i].field;
                        if (key && data.hasOwnProperty(key)) {
                            _data[position][key] = data[key];
                        }
                    }
                    updateRow(index, data);
                }
            },

            /**
             * @return all table data.
             */
            values : function() {
                return _data;
            },

            /**
             * Get the value at a specific index in the array.
             * 
             * @param index
             *            of the element to get.
             * @return the element at the specified object if found otherwise an
             *         empty object
             */
            valueAt : function(index) {
                if (validateIndex(index)) {
                    
                    // We need to consider the pagination since the index
                    // may be an ith index buth from an ith page.
                    // --> #TODO add a function for this & that check the index at the same time
                    // Get DataIndex
                    var arrayIndex = getArrayIndex(index);
                    var position = getUnfilteredIndex(arrayIndex);
                    return _data[position];
                }
                return {};
            },

            /**
             * @return the data of the row selected.
             */
            selectedRowValue : function() {
                return this.valueAt(_currentSelecteRowIndex);
            },

            /**
             * @ return the index of the table row selected.
             */
            selectedRowIndex : function() {
                return _currentSelecteRowIndex;
            },

            /**
             * Render the html table with data and go to the first page.
             */
            render : function() {
                refreshTableHeader();
                goToPage(1);
            },

            /**
             * Filter the table data.
             * 
             * @param filters
             *            the filters to use for filtering.
             */
            filterData : function(filters) {
                filter(filters);
                if (_filtered.length > 0) {
                    setPageSize(_pageSize);
                }
            },

            /**
             * Clear filters previously set.
             */
            clearFilters : function() {
                resetFilters();
                setPageSize(_pageSize);
            },
            
            /**
             * Remove all the data.
             */
            removeAll : function(){
                _data = [];
                refreshTableHeader();
                goToPage(1);
            }

        };
    }
}
