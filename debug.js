function section(header, content) {
    console.log(header)

    var hrule = "";
    for(var i = 0, ii = header.length; i < ii; i++) {
        hrule += "-"
    }

    console.log(hrule)
    console.log(content)
    console.log(hrule)
    console.log("")
}


module.exports = {
    section: section
}
