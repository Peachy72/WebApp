<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task 4</title>
</head>
<body>
    <?php
        function calculateFactorial($number) {
            $factorial = 1;
            for ($i = 1; $i <= $number; $i++) {
                $factorial *= $i;
            }
            return $factorial;
        }
        // Example: 
        echo "Factorial of 4 is " . calculateFactorial(4) . "<br>";
    ?>
</body>
</html>