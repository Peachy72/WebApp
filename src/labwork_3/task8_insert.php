<?php
$dbname = "labwork_3";
$conn = mysqli_connect("localhost", "root", "", $dbname);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
} else {
    echo "MySQL connected successfully!<br>";
    echo "Database '$dbname' selected successfully!<br>";
}

$sql_drop = "DROP TABLE IF EXISTS students";
if ($conn->query($sql_drop) === TRUE) {
    echo "Table 'students' dropped successfully!<br>";
} else {
    echo "Error dropping table: " . $conn->error . "<br>";
}

$sql_create_insert = "CREATE TABLE students (
                    ID INT AUTO_INCREMENT PRIMARY KEY,
                    Name VARCHAR(255),
                    Class VARCHAR(10),
                    Mark INT,
                    Sex VARCHAR(10)
                    );

    INSERT INTO students (Name, Class, Mark, Sex) VALUES
    ('John Deo', 'Four', 75, 'female'),
    ('Max Ruin', 'Three', 85, 'male'),
    ('Arnold', 'Three', 55, 'male'),
    ('Krish Star', 'Four', 60, 'female'),
    ('John Mike', 'Four', 60, 'female'),
    ('Alex John', 'Four', 55, 'male'),
    ('My John Rob', 'Fifth', 78, 'male'),
    ('Asruid', 'Five', 85, 'male'),
    ('Tes Qry', 'Six', 78, 'male'),
    ('Big John', 'Four', 55, 'female');
    ";

if ($conn->multi_query($sql_create_insert) === TRUE) {
    echo "Table 'students' created successfully!<br>";
} else {
    echo "Error creating table: " . $conn->error;
}

mysqli_close($conn);
