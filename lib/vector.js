"use strict";

function matrix2path(matrix) {
    var N = matrix.length;
    var filled = [];
    for (var row = -1; row <= N; row++) {
        filled[row] = [];
    }

    var path = [];
    for (var row = 0; row < N; row++) {
        for (var col = 0; col < N; col++) {
            if (filled[row][col]) continue;
            filled[row][col] = 1;
            if (isDark(row, col)) {
                if (!isDark(row - 1, col)) {
                    path.push(plot(row, col, 'right'));
                }
            } else {
                if (isDark(row, col - 1)) {
                    path.push(plot(row, col, 'down'));
                }
            }
        }
    }
    return path;

    function isDark(row, col) {
        if (row < 0 || col < 0 || row >= N || col >= N) return false;
        return !!matrix[row][col];
    }

    function plot(row0, col0, dir) {
        filled[row0][col0] = 1;
        var res = [];
        res.push(['M',  col0, row0 ]);
        var row = row0;
        var col = col0;
        var len = 0;
        do {
            switch (dir) {
            case 'right':
                filled[row][col] = 1;
                if (isDark(row, col)) {
                    filled[row - 1][col] = 1;
                    if (isDark(row - 1, col)) {
                        res.push(['h', len]);
                        len = 0;
                        dir = 'up';
                    } else {
                        len++;
                        col++;
                    }
                } else {
                    res.push(['h', len]);
                    len = 0;
                    dir = 'down';
                }
                break;
            case 'left':
                filled[row - 1][col - 1] = 1;
                if (isDark(row - 1, col - 1)) {
                    filled[row][col - 1] = 1;
                    if (isDark(row, col - 1)) {
                        res.push(['h', -len]);
                        len = 0;
                        dir = 'down';
                    } else {
                        len++;
                        col--;
                    }
                } else {
                    res.push(['h', -len]);
                    len = 0;
                    dir = 'up';
                }
                break;
            case 'down':
                filled[row][col - 1] = 1;
                if (isDark(row, col - 1)) {
                    filled[row][col] = 1;
                    if (isDark(row, col)) {
                        res.push(['v', len]);
                        len = 0;
                        dir = 'right';
                    } else {
                        len++;
                        row++;
                    }
                } else {
                    res.push(['v', len]);
                    len = 0;
                    dir = 'left';
                }
                break;
            case 'up':
                filled[row - 1][col] = 1;
                if (isDark(row - 1, col)) {
                    filled[row - 1][col - 1] = 1;
                    if (isDark(row - 1, col - 1)) {
                        res.push(['v', -len]);
                        len = 0;
                        dir = 'left';
                    } else {
                        len++;
                        row--;
                    }
                } else {
                    res.push(['v', -len]);
                    len = 0;
                    dir = 'right';
                }
                break;
            }
        } while (row != row0 || col != col0);
        return res;
    }
}

function PDF(matrix, stream, options) {
    // TODO deflate
    var N = matrix.length;
    //var scale = 3;
    //var X = (N + 2 * margin) * scale;
    //var size = ; // square side in pts
    //var X = size;
    
    //var scale = size / (N + 2 * margin); //original

    // label size in points
    var labelW = options.labelW;
    var labelH = options.labelH;
    
    //console.log(options);

    var scale = Math.min(labelH,labelW) / ( N + 2 * options.qr_margin );
    var data = [
        '%PDF-1.0\n\n',
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
        '2 0 obj << /Type /Pages /Count 1 /Kids [ 3 0 R ] >> endobj\n',
    ];
    data.push('3 0 obj << /Type /Page /Parent 2 0 R /Resources ' +
            '<< /Font\n '+ 
            '  << /F1\n '+ 
            '    << /Type /Font\n' +
            '       /Subtype /Type1\n' +
            '       /BaseFont /' + options.fontName + '\n' +
            '    >>\n' +
            '  >>\n' +
            '>>\n ' +
        '/Contents [5 0 R 4 0 R] /Count 2 /MediaBox [ 0 0 ' +  labelW + ' ' + labelH + ' ] >> endobj\n');

    var path = scale + ' 0 0 ' + scale + ' 0 0 cm\n';
    path += matrix2path(matrix).map(function(subpath) {
        var res = '';
        var x, y;
        for (var k = 0; k < subpath.length; k++) {
            var item = subpath[k];
            switch (item[0]) {
            case 'M':
                x = item[1] + options.qr_margin;
                y = N - item[2] + options.qr_margin;
                res += x + ' ' + y + ' m ';
                break;
            case 'h':
                x += item[1];
                res += x + ' ' + y + ' l ';
                break;
            case 'v':
                y -= item[1];
                res += x + ' ' + y + ' l ';
                break;
            }
        }
        res += 'h';
        return res;
    }).join('\n');
    path += '\nf\n';
    data.push('4 0 obj << /Length ' + path.length + ' >> stream\n' +
        ( options.qr > "" ? path : "" ) +
        'endstream\nendobj\n');

    // make block of text and add to pdf data
    var lineHeight = ( labelH - scale*2 ) / options.nLines;

    // open the text block and set font size
    var BT="  BT /F1 " + options.fontSize + " Tf\n";
    // set line height for T* command
    BT += lineHeight + " TL\n" 
    //set starting position for text
    if ( options.qr > "" ) {
        BT += scale + options.labelH + " " + (options.labelH - scale - lineHeight) + " Td\n"
    } else {
        BT += scale                  + " " + (options.labelH - scale - lineHeight) + " Td\n"
    }
    for (var i=1; i<=options.nLines; i++) {
        // add text for label1 through labelN
        if ( i > 1 ) {
            BT += "T* "; //line feed
        }
        if ( options["label"+i] ) {
            BT += "(" + options["label"+i] + ") Tj\n"
        }
    }
    // BT += labelH +" "+ ( labelH - scale - lineHeight*1 )  + " Td (" + options.label1 +") Tj\n"
       // + "T* (" + options.label2 +") Tj\n"
    BT += "ET\n";
    data.push('5 0 obj << /Length '+ BT.length + ' >> stream\n' +
            BT + 'endstream\nendobj\n');


    var xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (var i = 1, l = data[0].length; i < 6; i++) {
        xref += ('0000000000' + l).substr(-10) + ' 00000 n \n';
        l += data[i].length;
    }
    data.push(
        xref,
        'trailer << /Root 1 0 R /Size 6 >>\n',
        'startxref\n' + l + '\n%%EOF\n'
    );
    stream.push(data.join(''));
    stream.push(null);
}

module.exports = {
    pdf: PDF,
}
